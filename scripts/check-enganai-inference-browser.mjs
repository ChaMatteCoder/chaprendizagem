// enGAN.AI stage 04: real ONNX inference in Chromium, parity on screen, failures and retry.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const executable = process.env.CHROME_BIN || ['/snap/chromium/current/usr/lib/chromium-browser/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
assert.ok(executable, 'Chromium não encontrado. Defina CHROME_BIN.');
const baseUrl = process.env.ENGANAI_URL || 'http://127.0.0.1:4173';
const output = join(process.cwd(), 'docs/enganai/etapa-04/previews');
const bundle = join(process.cwd(), 'public/models/enganai/research/cpu-no-batchnorm-v1');
const exportRecord = JSON.parse(await readFile(join(bundle, 'onnx-export.json'), 'utf8'));
const profile = await mkdtemp(join(tmpdir(), 'enganai-stage4-'));
const browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-extensions', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
let serial = 0;
const pending = new Map();
const runtimeErrors = [];
const failedRequests = [];
const requested = [];
const interceptions = new Map(); // url fragment -> 'fail' | 'corrupt'
const sessions = new Set();

try {
  let port;
  for (let attempt = 0; attempt < 100 && !port; attempt++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(port, 'Chromium não iniciou.');
  const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tempo excedido: ${method}`)); }, 60000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const onPaused = async ({ requestId, request }, sessionId) => {
    const rule = [...interceptions].find(([fragment]) => request.url.includes(fragment));
    try {
      if (rule?.[1] === 'fail') return await command('Fetch.failRequest', { requestId, errorReason: 'Failed' }, sessionId);
      if (rule?.[1] === 'corrupt') {
        const bytes = await readFile(join(bundle, new URL(request.url).pathname.split('/cpu-no-batchnorm-v1/')[1]));
        bytes[bytes.length >> 1] ^= 0xff;
        return await command('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/octet-stream' }], body: bytes.toString('base64') }, sessionId);
      }
      await command('Fetch.continueRequest', { requestId }, sessionId);
    } catch { /* the target may have gone away */ }
  };
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const { method, params, sessionId } = message;
    if (method === 'Runtime.exceptionThrown') runtimeErrors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text);
    if (method === 'Network.requestWillBeSent') requested.push(params.request.url);
    if (method === 'Network.responseReceived' && params.response.status >= 400) failedRequests.push({ url: params.response.url, status: params.response.status });
    if (method === 'Fetch.requestPaused') onPaused(params, sessionId);
    // Dedicated workers are separate targets: intercept and observe their requests too.
    if (method === 'Target.attachedToTarget') {
      const child = params.sessionId;
      sessions.add(child);
      Promise.all([
        command('Network.enable', {}, child).catch(() => {}),
        command('Runtime.enable', {}, child).catch(() => {}),
        command('Fetch.enable', { patterns: [{ urlPattern: '*/models/enganai/*' }] }, child).catch(() => {}),
      ]).finally(() => command('Runtime.runIfWaitingForDebugger', {}, child).catch(() => {}));
    }
    if (method === 'Target.detachedFromTarget') sessions.delete(params.sessionId);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id); clearTimeout(task.timer);
    if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.ok(!result.exceptionDetails, result.exceptionDetails?.exception?.description || 'Erro no navegador.');
    return result.result.value;
  };
  const waitFor = async (condition, timeout = 60000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { if (await evaluate(`Boolean(${condition})`)) return; }
      catch (error) { if (!/context|navigat/i.test(error.message)) throw error; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Estado não encontrado: ${condition}`);
  };
  const open = async (path, width = 1440, height = 960) => {
    console.log(`Abrindo ${width}px: ${path}`);
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await evaluate('window.__oldDocument = true');
    await command('Page.navigate', { url: new URL(path, baseUrl).href });
    await waitFor(`!window.__oldDocument && document.querySelector('.gan-main h1')`);
  };
  const phase = () => evaluate(`document.querySelector('.gan-bench')?.dataset.inferencePhase`);
  const settled = () => waitFor(`['ready','error','unavailable'].includes(document.querySelector('.gan-bench')?.dataset.inferencePhase)`);
  const capture = async name => {
    await evaluate('Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode().catch(() => {}))])');
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const fits = () => evaluate(`(() => { const root = document.documentElement; if (root.scrollWidth > innerWidth + 1) throw new Error('Overflow horizontal: ' + root.scrollWidth); return true; })()`);
  // Recomputes, inside the page, the expected pixels from the PyTorch reference and compares them with the canvases.
  const canvasesMatchReference = item => evaluate(`(async () => {
    const response = await fetch('/models/enganai/research/cpu-no-batchnorm-v1/${item.reference.generatorOutput.path}');
    const reference = new Float32Array(await response.arrayBuffer());
    const half = v => { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };
    let maxDifference = 0, mismatches = 0, nonBlank = 0;
    const figures = [...document.querySelectorAll('.gan-bench-samples figure')];
    for (const figure of figures) {
      const index = Number(figure.dataset.latentIndex);
      const data = figure.querySelector('canvas').getContext('2d').getImageData(0, 0, 28, 28).data;
      for (let p = 0; p < 784; p++) {
        const x = Math.fround(Math.fround(reference[index * 784 + p] + 1) * 127.5);
        const expected = Math.min(255, Math.max(0, half(x)));
        const difference = Math.abs(data[p * 4] - expected);
        if (difference) mismatches++;
        if (data[p * 4]) nonBlank++;
        maxDifference = Math.max(maxDifference, difference);
      }
    }
    return { samples: figures.length, maxDifference, mismatches, nonBlank };
  })()`);

  await mkdir(output, { recursive: true });
  await command('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await command('Runtime.enable'); await command('Network.enable'); await command('Page.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/models/enganai/*' }] });
  await command('Network.setCacheDisabled', { cacheDisabled: true });

  // 1. The entry and the mural never download the runtime or the weights.
  await open('/enganai');
  await open('/enganai/missoes');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(requested.filter(url => /\.onnx|ort-wasm|inference\.worker/.test(url)).length, 0, 'Menu e mural não devem carregar modelos.');
  // Since stage 05 later cases unlock through progress; seed a valid record to reach every checkpoint.
  await evaluate(`localStorage.setItem('enganai.progress.v1', JSON.stringify({ schemaVersion: 1, kind: 'progress', dataMode: 'recorded', completedMissionIds: ['primeiros-rastros', 'novos-padroes'], missions: [{ missionId: 'primeiros-rastros', bestScore: 300, bestCorrect: 3, completions: 1 }, { missionId: 'novos-padroes', bestScore: 300, bestCorrect: 3, completions: 1 }], badges: ['first-mission'], completedSessionIds: ['s-seed-1', 's-seed-2'] }))`);

  // 2. Every mission checkpoint loads, verifies and shows exactly G(z) for the fixed vectors.
  const missions = [['primeiros-rastros', 1], ['novos-padroes', 4], ['grande-duelo', 8]];
  const results = [];
  for (const [mission, epoch] of missions) {
    await open(`/enganai/arena?missao=${mission}`);
    await settled();
    assert.equal(await phase(), 'ready', `Bancada de ${mission} deveria ficar pronta.`);
    const item = exportRecord.checkpoints.find(entry => entry.epoch === epoch);
    const dataset = await evaluate(`({...document.querySelector('.gan-bench').dataset})`);
    assert.equal(dataset.checkpointId, item.checkpointId);
    const canvas = await canvasesMatchReference(item);
    assert.equal(canvas.samples, 4);
    assert.ok(canvas.nonBlank > 0, 'As criações não podem ser telas vazias.');
    assert.ok(canvas.maxDifference <= exportRecord.tolerance.pixelMaxDifference, `Pixels diferentes da referência: ${JSON.stringify(canvas)}`);
    const facts = await evaluate(`[...document.querySelectorAll('.gan-bench-facts dd')].map(dd => dd.textContent)`);
    assert.match(facts[1], /0 decisões alteradas/);
    await fits();
    if (epoch === 8) await capture('bancada-pronta-desktop');
    results.push({ mission, epoch, checkpointId: dataset.checkpointId, readyMs: Number(dataset.readyMs), canvas, facts });
  }

  // 3. Within one page, a revisited checkpoint reuses the verified sessions.
  await evaluate(`document.querySelector('.gan-arena-note a[href$="/enganai/missoes"]').click()`);
  await waitFor(`document.querySelector('#gan-missions-title')`);
  await evaluate(`history.pushState({}, '', '/enganai/arena?missao=grande-duelo'); dispatchEvent(new PopStateEvent('popstate'))`);
  await settled();
  const warm = await evaluate(`({...document.querySelector('.gan-bench').dataset})`);
  assert.equal(warm.inferencePhase, 'ready');
  assert.equal(warm.cached, 'true', 'Sessões verificadas devem ser reaproveitadas no mesmo documento.');

  // 4. Network failure: explicit error, focus, no fabricated image, then retry recovers in place.
  interceptions.set('epoch-004/generator.onnx', 'fail');
  await open('/enganai/arena?missao=novos-padroes');
  await settled();
  assert.equal(await phase(), 'error', 'Falha de rede deve aparecer como erro.');
  assert.equal(await evaluate(`document.querySelectorAll('.gan-bench canvas').length`), 0, 'Nenhuma imagem pode substituir a falha.');
  assert.equal(await evaluate(`document.activeElement?.id`), 'gan-bench-title', 'O foco deve ir para o título do erro.');
  assert.equal(await evaluate(`document.querySelector('.gan-arena-stage').dataset.mission`), 'novos-padroes');
  await capture('bancada-erro-desktop');
  const networkMessage = await evaluate(`document.querySelector('.gan-bench-failure p').textContent`);
  interceptions.delete('epoch-004/generator.onnx');
  await evaluate(`[...document.querySelectorAll('.gan-bench button')].find(b => b.textContent.includes('Tentar novamente')).click()`);
  await settled();
  assert.equal(await phase(), 'ready', 'Tentar novamente deve recuperar a bancada.');
  assert.equal(await evaluate('location.search'), '?missao=novos-padroes', 'O contexto da missão deve ser preservado.');

  // 5. Tampered weights are rejected by the SHA-256 check.
  interceptions.set('epoch-001/discriminator.onnx', 'corrupt');
  await open('/enganai/arena?missao=primeiros-rastros');
  await settled();
  assert.equal(await phase(), 'error');
  assert.equal(await evaluate(`document.querySelector('.gan-bench').dataset.errorCode`), 'integrity');
  const integrityMessage = await evaluate(`document.querySelector('.gan-bench-failure p').textContent`);
  assert.match(integrityMessage, /SHA-256/);
  interceptions.delete('epoch-001/discriminator.onnx');

  // 6. Phone layout.
  await open('/enganai/arena?missao=grande-duelo', 390, 844);
  await settled();
  assert.equal(await phase(), 'ready');
  await fits();
  await evaluate(`document.querySelector('.gan-bench').scrollIntoView({ block: 'start' })`);
  await capture('bancada-pronta-390');

  // 7. Reduced motion stops the loading spinner.
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open('/enganai/arena?missao=grande-duelo');
  const spinnerAnimation = await evaluate(`(() => { const svg = document.querySelector('li[data-status="current"] svg'); return svg ? getComputedStyle(svg).animationName : 'none'; })()`);
  assert.equal(spinnerAnimation, 'none');
  await settled();
  await command('Emulation.setEmulatedMedia', { features: [] });

  // 8. Without WebAssembly the bench declares itself unavailable.
  const { identifier } = await command('Page.addScriptToEvaluateOnNewDocument', { source: 'delete globalThis.WebAssembly;' });
  await open('/enganai/arena?missao=grande-duelo');
  await settled();
  assert.equal(await phase(), 'unavailable');
  assert.equal(await evaluate(`document.querySelectorAll('.gan-bench canvas').length`), 0);
  await capture('bancada-indisponivel-desktop');
  await command('Page.removeScriptToEvaluateOnNewDocument', { identifier });

  const unexpectedFailures = failedRequests.filter(request => !request.url.endsWith('/favicon.ico'));
  assert.deepEqual(runtimeErrors, [], 'Erros de runtime no navegador.');
  assert.deepEqual(unexpectedFailures, [], 'Assets ou módulos indisponíveis.');
  const version = await command('Browser.getVersion');
  const report = {
    status: 'passed',
    baseUrl,
    browser: version.product,
    runtime: exportRecord.browserRuntime,
    tolerance: exportRecord.tolerance,
    checkpoints: results,
    warmRevisit: { checkpointId: warm.checkpointId, readyMs: Number(warm.readyMs), cached: true },
    failures: { network: networkMessage, integrity: integrityMessage, unavailable: 'no-webassembly' },
    tested: ['no-model-download-on-entry-and-mural', 'three-checkpoints-parity-in-browser', 'canvas-pixels-equal-pytorch-reference', 'session-reuse', 'network-error-focus-and-retry', 'tampered-weights-rejected', 'phone-390-no-overflow', 'reduced-motion-spinner', 'unavailable-without-webassembly'],
    runtimeErrors,
  };
  await writeFile(join(output, '../browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checkpoints: results.map(({ checkpointId, readyMs, canvas }) => ({ checkpointId, readyMs, maxPixelDifference: canvas.maxDifference })), warm: report.warmRevisit }, null, 2));
} finally {
  for (const task of pending.values()) clearTimeout(task.timer);
  socket?.close(); browser.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 250));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
