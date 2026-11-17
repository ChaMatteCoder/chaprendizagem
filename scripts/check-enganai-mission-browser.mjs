// enGAN.AI stage 05: a complete mission in Chromium (production build).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const executable = process.env.CHROME_BIN || ['/snap/chromium/current/usr/lib/chromium-browser/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
assert.ok(executable, 'Chromium não encontrado. Defina CHROME_BIN.');
const baseUrl = process.env.ENGANAI_URL || 'http://127.0.0.1:4173';
const output = join(process.cwd(), 'docs/enganai/etapa-05/previews');
const profile = await mkdtemp(join(tmpdir(), 'enganai-stage5-'));
const browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-extensions', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
let serial = 0;
const pending = new Map();
const runtimeErrors = [];
const failedRequests = [];
const blocked = new Set();

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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const { method, params, sessionId } = message;
    if (method === 'Runtime.exceptionThrown') runtimeErrors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text);
    if (method === 'Network.responseReceived' && params.response.status >= 400) failedRequests.push({ url: params.response.url, status: params.response.status });
    if (method === 'Fetch.requestPaused') {
      const fail = [...blocked].some(fragment => params.request.url.includes(fragment));
      command(fail ? 'Fetch.failRequest' : 'Fetch.continueRequest', fail ? { requestId: params.requestId, errorReason: 'Failed' } : { requestId: params.requestId }, sessionId).catch(() => {});
    }
    if (method === 'Target.attachedToTarget') {
      const child = params.sessionId;
      Promise.all([
        command('Runtime.enable', {}, child).catch(() => {}),
        command('Fetch.enable', { patterns: [{ urlPattern: '*/data/enganai/*' }, { urlPattern: '*/models/enganai/*' }] }, child).catch(() => {}),
      ]).finally(() => command('Runtime.runIfWaitingForDebugger', {}, child).catch(() => {}));
    }
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
  const capture = async name => {
    await evaluate('Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode().catch(() => {}))])');
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const fits = () => evaluate(`(() => { if (document.documentElement.scrollWidth > innerWidth + 1) throw new Error('Overflow horizontal: ' + document.documentElement.scrollWidth); return true; })()`);
  const clickText = text => evaluate(`(() => { const b = [...document.querySelectorAll('button, a')].find(el => el.textContent.trim().includes(${JSON.stringify(text)})); if (!b) throw new Error('Sem botão: ' + ${JSON.stringify(text)}); b.click(); return true; })()`);
  const benchReady = () => waitFor(`document.querySelector('.gan-bench')?.dataset.inferencePhase === 'ready'`);
  const startMission = async () => {
    await benchReady();
    await clickText('Começar investigação');
    await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'investigating'`);
  };
  const progress = () => evaluate(`JSON.parse(localStorage.getItem('enganai.progress.v1'))`);
  // Answers every remaining round with `choice`, returning what each reveal recorded.
  const playRemaining = async (choice, onRound = async () => {}) => {
    const rounds = [];
    while (await evaluate(`document.querySelector('.gan-round-stage')?.dataset.phase === 'investigating'`)) {
      const round = await evaluate(`Number(document.querySelector('.gan-round-stage').dataset.round)`);
      await evaluate(`document.querySelectorAll('.gan-origin-choice')[${choice === 'real' ? 0 : 1}].click()`);
      await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'revealed'`);
      rounds.push(await evaluate(`({ round: ${round}, correct: document.querySelector('.gan-reveal').dataset.correct === 'true', origin: document.querySelectorAll('.gan-reveal-facts dd')[1].textContent, provenance: document.querySelector('.gan-provenance').textContent })`));
      await onRound(round);
      await clickText(round === 5 ? 'Ver relatório' : 'Próxima rodada');
      await waitFor(round === 5 ? `document.querySelector('.gan-summary-stage')` : `document.querySelector('.gan-round-stage')?.dataset.round === '${round + 1}'`);
    }
    return rounds;
  };

  await mkdir(output, { recursive: true });
  await command('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await command('Runtime.enable'); await command('Network.enable'); await command('Page.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/data/enganai/*' }, { urlPattern: '*/models/enganai/*' }] });

  // 1. Fresh visitor: later cases are locked, also when opened by URL.
  await open('/enganai/missoes');
  assert.match(await evaluate(`document.querySelector('.gan-board-progress').textContent`), /0 de 3/);
  await open('/enganai/arena?missao=novos-padroes');
  assert.equal(await evaluate(`document.querySelector('[data-locked-mission]')?.dataset.lockedMission`), 'novos-padroes');

  // 2. Briefing, investigation, single answer, focus and reveal.
  const seed = 4242;
  await open(`/enganai/arena?missao=primeiros-rastros&semente=${seed}`);
  await benchReady();
  await capture('briefing-desktop');
  await clickText('Começar investigação');
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'investigating'`);
  const evidence = await evaluate(`(async () => { const img = document.querySelector('.gan-evidence-frame img'); await img.decode(); return { src: img.src.slice(0, 5), width: img.naturalWidth, height: img.naturalHeight, text: document.querySelector('.gan-round-stage').textContent }; })()`);
  assert.equal(evidence.src, 'blob:');
  assert.deepEqual([evidence.width, evidence.height], [28, 28]);
  assert.ok(!/Origem registrada|A Lupa disse/.test(evidence.text), 'A origem e o palpite não aparecem antes da resposta.');
  await fits();
  await capture('investigacao-desktop');
  await evaluate(`(() => { const b = document.querySelectorAll('.gan-origin-choice')[0]; b.click(); b.click(); })()`);
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'revealed'`);
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.gan-reveal h2')`), true, 'O foco vai para o resultado.');
  const firstReveal = await evaluate(`({ correct: document.querySelector('.gan-reveal').dataset.correct === 'true', score: Number(document.querySelector('.gan-round-score strong').textContent), provenance: document.querySelector('.gan-provenance').textContent })`);
  assert.equal(firstReveal.score, firstReveal.correct ? 100 : 0, 'Clique duplo pontua uma vez.');
  await evaluate(`document.querySelector('.gan-provenance').open = true`);
  await capture('revelacao-desktop');
  await clickText('Próxima rodada');
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.round === '2'`);
  assert.equal(await evaluate(`document.activeElement?.id`), 'gan-round-title');

  // 3. Leaving asks for confirmation; Escape keeps the session.
  await clickText('Sair da missão');
  await waitFor(`document.querySelector('.gan-exit-dialog')?.open`);
  await capture('saida-desktop');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('.gan-exit-dialog')?.open`);
  assert.equal(await evaluate(`document.querySelector('.gan-round-stage')?.dataset.round`), '2');

  // 4. Finish, report, review and stored progress.
  const rounds = [{ round: 1, correct: firstReveal.correct, provenance: firstReveal.provenance }, ...(await playRemaining('synthetic'))];
  const correct = rounds.filter(round => round.correct).length;
  const summary = await evaluate(`({ ...document.querySelector('.gan-summary-stage').dataset, focus: document.activeElement?.id, save: document.querySelector('.gan-summary-save').textContent })`);
  assert.equal(Number(summary.score), correct * 100);
  assert.equal(summary.saveStatus, 'saved');
  assert.equal(summary.focus, 'gan-summary-title');
  assert.match(summary.save, /Novos padrões/);
  let stored = await progress();
  assert.deepEqual(stored.completedSessionIds, [summary.sessionId]);
  assert.equal(stored.missions[0].bestScore, correct * 100);
  await evaluate(`document.querySelectorAll('.gan-summary-rounds button')[2].click()`);
  await waitFor(`document.querySelector('.gan-summary-review .gan-reveal')`);
  await fits();
  await capture('relatorio-desktop');

  // 5. The same seed reproduces the same selection and image bytes.
  await open(`/enganai/arena?missao=primeiros-rastros&semente=${seed}`);
  await startMission();
  await evaluate(`document.querySelectorAll('.gan-origin-choice')[0].click()`);
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'revealed'`);
  assert.equal(await evaluate(`document.querySelector('.gan-provenance').textContent`), firstReveal.provenance, 'Mesma semente, mesma amostra e mesmo PNG.');

  // 6. Replay counts a new session once; the previous one is not counted again.
  await clickText('Próxima rodada');
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.round === '2'`);
  await playRemaining('real');
  await clickText('Jogar de novo');
  await startMission();
  await playRemaining('real');
  stored = await progress();
  assert.equal(stored.completedSessionIds.length, 3);
  assert.equal(new Set(stored.completedSessionIds).size, 3);
  assert.equal(stored.missions[0].completions, 3);
  assert.ok(stored.missions[0].bestScore >= correct * 100, 'O melhor resultado não diminui.');

  // 7. The mural shows completion, best score and the unlocked case.
  await open('/enganai/missoes');
  const mural = await evaluate(`({ progress: document.querySelector('.gan-board-progress').textContent, folders: [...document.querySelectorAll('.gan-folder-status')].map(el => el.textContent), previews: [...document.querySelectorAll('.gan-folder-photo img')].map(img => img.naturalWidth) })`);
  assert.match(mural.progress, /1 de 3/);
  assert.match(mural.folders[0], /Concluída · \d+ pts/);
  assert.match(mural.folders[1], /Disponível/);
  assert.deepEqual(mural.previews, [28, 28, 28]);
  await capture('mural-progresso-desktop');

  // 8. A failed preparation is explicit and recoverable without changing the mission.
  blocked.add('arena/real-pool.u8');
  await open('/enganai/arena?missao=novos-padroes');
  await benchReady();
  await clickText('Começar investigação');
  await waitFor(`document.querySelector('.gan-arena-stage')?.dataset.sessionPhase === 'error'`);
  assert.equal(await evaluate(`document.activeElement?.textContent`), 'As evidências não ficaram prontas.');
  assert.equal(await evaluate(`document.querySelectorAll('.gan-evidence-frame').length`), 0);
  await capture('preparo-erro-desktop');
  blocked.clear();
  await clickText('Tentar novamente');
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'investigating'`);

  // 9. Phone: evidence first, choices close by, no horizontal scroll.
  await open('/enganai/arena?missao=novos-padroes', 390, 844);
  await startMission();
  await fits();
  const order = await evaluate(`(() => { const a = document.querySelector('.gan-evidence-frame').getBoundingClientRect(); const b = document.querySelector('.gan-origin-choice').getBoundingClientRect(); return { evidenceTop: a.top, choiceTop: b.top, choiceBottom: b.bottom, choiceHeight: b.height, viewport: innerHeight }; })()`);
  assert.ok(order.evidenceTop < order.choiceTop, 'No celular, a evidência vem antes das respostas.');
  assert.ok(order.choiceHeight >= 44, 'Área de toque confortável.');
  assert.ok(order.choiceBottom <= order.viewport, `As respostas devem caber na primeira tela: ${JSON.stringify(order)}`);
  await capture('investigacao-390');
  await evaluate(`document.querySelectorAll('.gan-origin-choice')[1].click()`);
  await waitFor(`document.querySelector('.gan-round-stage')?.dataset.phase === 'revealed'`);
  await fits();
  await evaluate(`document.querySelector('.gan-reveal').scrollIntoView({ block: 'start' })`);
  await capture('revelacao-390');

  const unexpected = failedRequests.filter(request => !request.url.endsWith('/favicon.ico'));
  assert.deepEqual(runtimeErrors, [], 'Erros de runtime no navegador.');
  assert.deepEqual(unexpected, [], 'Assets ou módulos indisponíveis.');
  const version = await command('Browser.getVersion');
  const report = {
    status: 'passed',
    baseUrl,
    browser: version.product,
    seed,
    firstMission: { correct, score: correct * 100, rounds: rounds.map(({ round, correct: ok }) => ({ round, correct: ok })) },
    storedProgress: stored,
    tested: ['locked-cases-by-url', 'briefing-after-bench-verification', 'origin-hidden-before-answer', 'png-blob-28x28', 'double-click-scores-once', 'focus-reveal-and-next-round', 'exit-confirmation-escape', 'summary-score-equals-answers', 'progress-saved-once', 'review-in-report', 'seed-reproduces-sample-and-png', 'replay-new-session-no-duplicates', 'mural-best-score-and-unlock', 'registered-previews-in-mural', 'preparation-error-and-retry', 'phone-390-order-touch-and-overflow'],
    runtimeErrors,
  };
  await writeFile(join(output, '../browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, firstMission: report.firstMission, completions: stored.missions[0].completions }, null, 2));
} finally {
  for (const task of pending.values()) clearTimeout(task.timer);
  socket?.close(); browser.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 250));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
