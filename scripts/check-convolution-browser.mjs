import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Executado na página real: o tamanho visual deve sobreviver ao reset do bitmap.
export async function exerciseConvolutionPage() {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async condition => {
    const start = performance.now();
    while (!condition()) {
      if (performance.now() - start > 10000) throw new Error('A página não concluiu a operação.');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };
  const status = text => document.querySelector('.conv-status')?.textContent.includes(text);
  await wait(() => status('Imagem pronta'));
  const counters = { created: 0, active: 0, copies: 0 };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) { super(...args); counters.created++; counters.active++; this.released = false; }
    postMessage(data, ...args) { if (data.image) counters.copies++; return super.postMessage(data, ...args); }
    terminate() { if (!this.released) { this.released = true; counters.active--; } super.terminate(); }
  };
  const apply = async () => {
    document.querySelector('.conv-actions .button').click();
    await wait(() => status('Convolução concluída'));
    check(!document.querySelector('.conv-error'), 'Erro ao aplicar a convolução.');
  };
  try {
    await apply();
    const outputCanvases = Array.from(document.querySelectorAll('.conv-output-image canvas'));
    const canvas = document.querySelector('.conv-canvas canvas');
    const width = canvas.width; const height = canvas.height;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height);
    const initial = canvas.getBoundingClientRect();
    check(initial.width > 0 && initial.height > 0, 'Imagem sem área visual.');
    // Inclui os estados transitórios 0 × H e W × 0 durante limpeza/redimensionamento.
    for (const [w, h] of [[0, height], [0, 0], [width, 0], [width, height]]) {
      canvas.width = w; canvas.height = h;
      const bounds = canvas.getBoundingClientRect();
      check(Math.abs(bounds.width - initial.width) < 1 && Math.abs(bounds.height - initial.height) < 1,
        `O reset ${w} × ${h} alterou a área visual do canvas.`);
    }
    canvas.getContext('2d').putImageData(pixels, 0, 0);
    for (let index = 0; index < 50; index++) {
      document.querySelectorAll('.conv-presets button')[index % 8].click();
      await wait(() => status('Imagem pronta'));
      await apply();
      check(outputCanvases.every((node, position) => node === document.querySelectorAll('.conv-output-image canvas')[position]),
        'A troca de filtros recriou os canvases.');
      for (const node of document.querySelectorAll('.conv-canvas canvas')) {
        const bounds = node.getBoundingClientRect();
        check(bounds.width > 0 && bounds.width <= innerWidth && bounds.height > 0 && bounds.height < 2000,
          'O canvas ultrapassou os limites da visualização.');
      }
    }
    check(counters.created === 1 && counters.copies === 1 && counters.active === 1,
      'As aplicações acumularam workers ou cópias da entrada.');
    const profilerRows = performance.getEntriesByType('measure').map(entry => entry.detail?.devtools?.properties?.length || 0);
    const maxProfilerRows = Math.max(0, ...profilerRows);
    check(maxProfilerRows < 1000, 'O profiler enumerou buffers de pixels nas props.');
    const repeated = { ...counters, applications: 51, maxProfilerRows };
    const select = document.querySelector('.conv-kernel-heading select');
    select.value = '5'; select.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(() => status('Imagem pronta'));
    await apply();
    check(document.querySelectorAll('.conv-kernel-editor input').length === 25, 'Kernel 5 × 5 indisponível.');
    for (let index = 0; index < 6; index++) {
      document.querySelector('.conv-actions .button').click();
      document.querySelectorAll('.conv-presets button')[index].click();
      await wait(() => status('Imagem pronta'));
      check(counters.active === 0, 'O cancelamento reteve um worker.');
      await apply();
    }
    document.querySelector('.brand').click();
    await wait(() => !document.querySelector('.conv-page'));
    await wait(() => counters.active === 0);
    return { ...repeated, cancellations: 6, workersAfterLeaving: counters.active };
  } finally {
    window.Worker = NativeWorker;
  }
}

async function browserPss(pid) {
  if (process.platform !== 'linux') return null;
  let bytes = 0;
  const visit = async id => {
    try {
      const text = await readFile(`/proc/${id}/smaps_rollup`, 'utf8');
      bytes += Number(text.match(/^Pss:\s+(\d+)/m)?.[1] ?? 0) * 1024;
      const children = await readFile(`/proc/${id}/task/${id}/children`, 'utf8');
      await Promise.all(children.trim().split(/\s+/).filter(Boolean).map(visit));
    } catch (error) { if (!['ENOENT', 'ESRCH', 'EACCES'].includes(error.code)) throw error; }
  };
  await visit(pid);
  return bytes;
}

async function main() {
  const executable = process.env.CHROME_BIN || [
    '/snap/chromium/current/usr/lib/chromium-browser/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  ].find(existsSync);
  assert.ok(executable, 'Defina CHROME_BIN com o caminho de um Chromium instalado.');
  const profile = await mkdtemp(join(tmpdir(), 'convolution-browser-'));
  const browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-extensions', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { detached: true, stdio: 'ignore' });
  const stop = () => { if (browser.exitCode === null) browser.kill('SIGTERM'); };
  let ws; let monitor; let sampling = false; let peak = 0; let memoryError;
  const pending = new Map();
  let serial = 0;
  try {
    monitor = setInterval(async () => {
      if (sampling) return;
      sampling = true;
      try {
        const bytes = await browserPss(browser.pid);
        peak = Math.max(peak, bytes ?? 0);
        // Impede que uma regressão de renderização derrube a máquina de testes.
        if (bytes > 768 * 1024 ** 2) {
          memoryError = new Error('O navegador de teste ultrapassou 768 MiB de PSS.');
          stop();
          for (const task of pending.values()) task.reject(memoryError);
        }
      } catch (error) { memoryError = error; stop(); }
      finally { sampling = false; }
    }, 200);
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (memoryError) throw memoryError;
      try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(port, 'O Chromium não iniciou o depurador.');
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(JSON.stringify(message.error)));
      else task.resolve(message.result);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tempo excedido: ${method}`)); }, 30000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const url = new URL('/convolucao', process.env.CONVOLUTION_URL || 'http://127.0.0.1:5173').href;
    await command('Page.navigate', { url });
    const result = await command('Runtime.evaluate', { expression: `(${exerciseConvolutionPage.toString()})()`, awaitPromise: true, returnByValue: true });
    assert.ok(!result.exceptionDetails, result.exceptionDetails?.exception?.description || 'Falha na página.');
    if (memoryError) throw memoryError;
    console.log(JSON.stringify({ ...result.result.value, peakBrowserPssMiB: Math.round(peak / 1024 ** 2) }, null, 2));
  } finally {
    clearInterval(monitor);
    for (const task of pending.values()) clearTimeout(task.timer);
    ws?.close(); stop();
    await new Promise(resolve => setTimeout(resolve, 200));
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  await main();
}
