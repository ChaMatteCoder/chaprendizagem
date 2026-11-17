import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const executable = process.env.CHROME_BIN || ['/snap/chromium/current/usr/lib/chromium-browser/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
assert.ok(executable, 'Chromium não encontrado. Defina CHROME_BIN.');
const baseUrl = process.env.ENGANAI_URL || 'http://127.0.0.1:5173';
// ENGANAI_PREVIEW_DIR lets later stages rerun this regression without replacing stage-02 evidence.
const output = process.env.ENGANAI_PREVIEW_DIR || join(process.cwd(), 'docs/enganai/etapa-02/previews');
const profile = await mkdtemp(join(tmpdir(), 'enganai-stage2-'));
const browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-extensions', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
let serial = 0;
const pending = new Map();
const runtimeErrors = [];
const failedRequests = [];

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(port, 'Chromium não iniciou.');
  const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedRequests.push({ url: message.params.response.url, status: message.params.response.status });
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id); clearTimeout(task.timer);
    if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tempo excedido: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression, userGesture = false) => {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture });
    assert.ok(!result.exceptionDetails, result.exceptionDetails?.exception?.description || 'Erro no navegador.');
    return result.result.value;
  };
  const waitFor = async condition => {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      let ready = false;
      try { ready = await evaluate(`Boolean(${condition})`); }
      catch (error) { if (!/context|navigat/i.test(error.message)) throw error; }
      if (ready) {
        await evaluate(`(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));return true;})()`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Estado não encontrado: ${condition}`);
  };
  const button = text => `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
  const click = async selector => { await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.focus();element.click();})()`); };
  const open = async (path, width = 1440, height = 960, deviceScaleFactor = 1) => {
    console.log(`Conferindo ${width}px: ${path}`);
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
    await evaluate('window.__enganaiOldDocument = true');
    await command('Page.navigate', { url: new URL(path, baseUrl).href });
    await waitFor(`!window.__enganaiOldDocument && document.querySelector('.gan-main h1') && location.pathname===${JSON.stringify(new URL(path, baseUrl).pathname)}`);
  };
  const capture = async name => {
    await evaluate(`Promise.all(document.querySelector('.gan-main').getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))`);
    const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const fits = async () => evaluate(`(() => {const root=document.documentElement;const bad=[...document.querySelectorAll('.gan-main button,.gan-main input,.gan-dialog[open] button')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.left < -1 || r.right > innerWidth+1)}).map(el=>el.textContent.trim());if(root.scrollWidth>innerWidth+1||bad.length)throw new Error('Overflow: '+JSON.stringify({width:innerWidth,scrollWidth:root.scrollWidth,bad}));return {width:innerWidth,scrollWidth:root.scrollWidth};})()`);

  await mkdir(output, { recursive: true });
  await command('Runtime.enable'); await command('Network.enable'); await command('Page.enable');
  await command('Page.bringToFront');
  await command('Emulation.setFocusEmulationEnabled', { enabled: true });
  await open('/enganai'); await fits(); await capture('inicio-desktop');
  await click('.gan-start-button'); await waitFor(`document.querySelector('#gan-missions-title')`); await fits(); await capture('mural-desktop');

  if (!process.env.ENGANAI_CAPTURE_ONLY) {
    await evaluate(`document.querySelectorAll('.gan-mission-folder')[1].click()`);
    await waitFor(`document.querySelector('.gan-case-lock')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.gan-case-description a[href*="arena"]'))`), false, 'Caso bloqueado não deve abrir uma sessão.');
    await evaluate(`document.querySelectorAll('.gan-mission-folder')[0].click()`);
    await click('.gan-case-description a[href*="arena"]');
    await waitFor(`document.querySelector('.gan-arena-preparation')`); await fits(); await capture('bancada-desktop');
    assert.equal(await evaluate(`document.querySelectorAll('.gan-quiz-choices').length`), 0, 'Arena não deve inventar rodadas sem modelo.');
    await click('.gan-arena-note a[href*="aquecimento"]'); await waitFor(`document.querySelector('.gan-quiz-choices')`);
    for (let round = 0; round < 3; round++) {
      await click('[aria-label="Responder Fifi, o Gerador"]');
      await waitFor(`document.querySelector('.gan-feedback-text')`);
      if (round === 0) await capture('aquecimento-feedback-desktop');
      assert.equal(await evaluate(`document.activeElement===document.querySelector('.gan-quiz-feedback button')`), true, 'Feedback deve preservar o caminho por teclado.');
      const label = round === 2 ? 'Ver meu resultado' : 'Próxima pergunta';
      await evaluate(`${button(label)}.click()`);
      await waitFor(round === 2 ? `document.querySelector('.gan-quiz-result')` : `document.querySelector('.gan-quiz-choices button:not(:disabled)')`);
    }
    assert.match(await evaluate(`document.querySelector('.gan-quiz-result').textContent`), /2 de 3/);
    assert.equal(await evaluate(`localStorage.getItem('enganai.progress.v1')`), null, 'O quiz não pode concluir missões.');
    await click('.gan-quiz-result a[href*="missoes"]'); await waitFor(`document.querySelector('#gan-missions-title')`);
    assert.match(await evaluate(`document.querySelector('.gan-board-progress').textContent`), /0 de 3/);

    await click('[aria-label="Abrir preferências e ajuda"]'); await waitFor(`document.querySelector('dialog[open]')`);
    await evaluate(`${button('Sistema')}.click()`); await waitFor(`document.querySelector('.gan-app').dataset.reducedMotion==='true'`);
    await evaluate(`${button('Técnicas')}.click()`);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('enganai.preferences.v1')).explanation`), 'technical');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(`!document.querySelector('dialog[open]')`);
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'Abrir preferências e ajuda', 'Escape deve devolver o foco.');
    await click('[aria-label="Abrir preferências e ajuda"]');
    await waitFor(`document.querySelector('dialog[open]')`);
    for (let step = 0; step < 14; step++) {
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert.equal(await evaluate(`Boolean(document.activeElement.closest('dialog[open]'))`), true, 'Tab deve permanecer na janela modal.');
    }
    await click('.gan-settings-help button');
    await waitFor(`document.querySelector('dialog[open] .gan-glossary')`);
    await capture('glossario-desktop');
    await click('[aria-label="Fechar janela"]');
    await waitFor(`!document.querySelector('dialog[open]')`);
    await open('/enganai/lab');
    assert.equal(await evaluate(`document.querySelector('.gan-mode-switch').getAttribute('aria-pressed')`), 'true');
    assert.equal(await evaluate(`document.querySelector('.gan-app').dataset.reducedMotion`), 'true');
    await fits(); await capture('ganlab-desktop');
    await open('/enganai/museu');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Reproduzir sequência')).disabled`), true);

    await open('/enganai');
    await evaluate(`document.querySelector('[aria-label="Ativar som ambiente"]').click()`, true);
    await waitFor(`document.querySelector('[aria-label="Desligar som ambiente"]')`);
    await click('[aria-label="Desligar som ambiente"]');
    await waitFor(`document.querySelector('[aria-label="Ativar som ambiente"]')`);

    const incompatible = JSON.stringify({ schemaVersion: 2, doNotOverwrite: true });
    await evaluate(`localStorage.setItem('enganai.preferences.v1',${JSON.stringify(incompatible)})`);
    await open('/enganai'); await click('[aria-label="Abrir preferências e ajuda"]'); await waitFor(`document.querySelector('dialog[open]')`);
    await evaluate(`${button('Técnicas')}.click()`);
    assert.equal(await evaluate(`localStorage.getItem('enganai.preferences.v1')`), incompatible, 'Formato futuro deve ser preservado.');
    await evaluate(`${button('Redefinir preferências')}.click()`);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('enganai.preferences.v1')).explanation`), 'intuitive');
    await click('[aria-label="Fechar janela"]');

    const blockedStorage = await command('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}});` });
    await open('/enganai'); await click('[aria-label="Abrir preferências e ajuda"]');
    await waitFor(`document.querySelector('dialog[open] .gan-settings-notice')`);
    await evaluate(`${button('Técnicas')}.click()`);
    assert.equal(await evaluate(`${button('Técnicas')}.getAttribute('aria-pressed')`), 'true', 'Preferências em memória devem continuar disponíveis.');
    await click('[aria-label="Fechar janela"]');
    await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: blockedStorage.identifier });
  }

  const responsive = [];
  for (const width of [320, 390, 768, 1440]) {
    for (const path of ['/enganai', '/enganai/missoes', '/enganai/arena?missao=primeiros-rastros', '/enganai/aquecimento', '/enganai/lab', '/enganai/museu', '/enganai/mutacoes', '/enganai/caos']) {
      await open(path, width, width < 700 ? 844 : 960);
      responsive.push({ path, ...(await fits()) });
      if (path === '/enganai') await capture(`inicio-${width}`);
      if (width === 390 && ['/enganai/missoes','/enganai/aquecimento','/enganai/lab'].includes(path)) await capture(`${path.split('/').at(-1)}-mobile`);
    }
    await open('/enganai', width, width < 700 ? 844 : 960);
    await click('[aria-label="Explorar ambientes"]'); await waitFor(`document.querySelector('dialog[open]')`); await fits();
    await click('[aria-label="Fechar janela"]');
  }
  await open('/enganai/missoes', 720, 480, 2); await fits(); await capture('mural-zoom-equivalente-200');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open('/enganai');
  await waitFor(`document.querySelector('.gan-app').dataset.reducedMotion==='true'`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.gan-home-fifi img')).animationName`), 'none');
  assert.deepEqual(runtimeErrors, [], 'Erros de runtime no navegador.');
  assert.deepEqual(failedRequests.filter(request => !request.url.endsWith('/favicon.ico')), [], 'Assets ou módulos indisponíveis.');
  const report = { status: process.env.ENGANAI_CAPTURE_ONLY ? 'previews-only' : 'passed', baseUrl, responsive, runtimeErrors, failedRequests, tested: process.env.ENGANAI_CAPTURE_ONLY ? ['32-responsive-route-combinations', 'equivalent-200-percent-viewport', 'reduced-motion-system'] : ['menu-mural-bancada-aquecimento', 'quiz-score-isolation', 'keyboard-focus', 'native-dialog-escape-and-tab-trap', 'glossary-dialog-navigation', 'preferences-persistence', 'incompatible-preferences-preserved', 'blocked-storage-memory-fallback', 'sound-on-off', 'reduced-motion-system-and-manual', '32-responsive-route-combinations', 'equivalent-200-percent-viewport'] };
  await writeFile(join(output, '../browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, combinations: responsive.length, runtimeErrors, failedRequests }, null, 2));
} finally {
  for (const task of pending.values()) clearTimeout(task.timer);
  socket?.close(); browser.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 250));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
