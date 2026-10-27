import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function startDistServer() {
  const root = join(process.cwd(), 'dist');
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bin': 'application/octet-stream',
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer((req, res) => {
      const requestPath = decodeURIComponent(
        new URL(req.url, 'http://127.0.0.1').pathname,
      );
      const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = join(root, safePath);
      if (!existsSync(filePath) || requestPath === '/') {
        filePath = join(root, 'index.html');
      }
      res.setHeader(
        'Content-Type',
        contentTypes[extname(filePath)] || 'application/octet-stream',
      );
      createReadStream(filePath)
        .on('error', () => {
          res.statusCode = 404;
          res.end('Not found');
        })
        .pipe(res);
    });
    server.on('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolvePromise({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

export async function exercisePixelApp() {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const wait = async (condition, label, timeoutMs = 25000) => {
    const start = performance.now();
    while (!condition()) {
      if (performance.now() - start > timeoutMs)
        throw new Error(`Tempo excedido: ${label}`);
      await new Promise((r) => setTimeout(r, 25));
    }
  };
  const button = (text) =>
    Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.includes(text),
    );
  const link = (text) =>
    Array.from(document.querySelectorAll('a')).find((a) =>
      a.textContent.includes(text),
    );
  const fits = () =>
    check(
      document.documentElement.scrollWidth <= innerWidth + 1,
      'Overflow horizontal.',
    );
  const pixels = (canvas) =>
    Array.from(canvas.getContext('2d').getImageData(0, 0, 32, 32).data).join(
      ',',
    );
  const changeBrightness = (value) => {
    const slider = document.querySelector('input[aria-label="Brilho"]');
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set.call(slider, String(value));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  };
  await wait(() => document.querySelector('#pixel-hero-title'), 'menu');
  fits();
  link('Vamos jogar').click();
  await wait(() => button('Começar partida'), 'instruções');
  button('Começar partida').click();
  await wait(
    () => document.querySelector('.pixel-game-image-pair canvas'),
    'rodada 1',
  );
  check(
    document.querySelectorAll('.pixel-game-image-pair canvas').length === 2,
    'O original deve permanecer oculto.',
  );
  await new Promise((r) => requestAnimationFrame(r));
  const receivedPixels = pixels(
    document.querySelector('.pixel-image-column canvas'),
  );
  for (let query = 1; query <= 3; query += 1) {
    changeBrightness(query * 10);
    await wait(
      () => document.querySelector('.pixel-preview-status.is-pending'),
      'prévia não testada',
    );
    const test = button('Testar ajustes');
    check(
      test && !test.disabled,
      'O teste deve estar disponível após ajustar.',
    );
    test.click();
    await wait(
      () =>
        document.querySelector(
          `.pixel-test-budget [aria-label="${3 - query} de 3 testes restantes"]`,
        ) &&
        !document.querySelector('.pixel-preview-status.is-pending') &&
        !button('Analisando'),
      `teste ${query}`,
    );
  }
  check(
    button('Testar ajustes').disabled,
    'Três testes devem bloquear novas consultas.',
  );
  check(
    Array.from(document.querySelectorAll('input[type="range"]')).every(
      (i) => i.disabled,
    ),
    'Controles devem bloquear após três testes.',
  );
  check(
    pixels(document.querySelector('.pixel-image-column canvas')) ===
      receivedPixels,
    'Imagem recebida foi modificada.',
  );
  const testedPixels = pixels(
    document.querySelector('.pixel-image-column.is-adjusted canvas'),
  );
  button('Revelar resposta').click();
  await wait(
    () => document.querySelector('.pixel-original-revealed canvas'),
    'revelação',
  );
  check(
    document.querySelectorAll('.pixel-reveal-grid canvas').length === 3,
    'A revelação precisa comparar três imagens.',
  );
  fits();
  link('Por que a rede respondeu assim?').click();
  await wait(
    () =>
      document.querySelector('.pixel-data-visual canvas') &&
      document.querySelector('.pixel-data-prediction .pixel-prediction'),
    'imagem do jogo no laboratório',
  );
  check(
    document
      .querySelector('.pixel-lab-context')
      .textContent.includes('Imagem da rodada 1'),
    'Contexto da rodada perdido.',
  );
  check(
    pixels(document.querySelector('.pixel-data-visual canvas')) ===
      testedPixels,
    'Laboratório não recebeu os pixels efetivamente testados.',
  );
  const visited = [];
  for (let i = 0; i < 5; i += 1) {
    document.querySelectorAll('.pixel-tab-btn')[i].click();
    await wait(
      () =>
        document
          .querySelectorAll('.pixel-tab-btn')
          .item(i).getAttribute('aria-current') === 'step',
      'troca de etapa',
    );
    await new Promise((r) => requestAnimationFrame(r));
    fits();
    if (i === 1) {
      await wait(
        () =>
          document.querySelectorAll('.pixel-fmaps-grid canvas').length === 8,
        'mapas reais',
      );
      button('3. Depois do MaxPooling').click();
      await wait(
        () => document.querySelector('.pixel-fmaps-grid canvas')?.width === 16,
        'mapas após pooling',
      );
    }
    if (i === 2) {
      check(
        document.querySelectorAll('.pixel-channel-math-card').length === 3,
        'Três canais da convolução ausentes.',
      );
      document.querySelector('.pixel-channel-math-card summary').click();
      fits();
    }
    visited.push(document.querySelector('.pixel-lab-question h2').textContent);
  }
  button('Explorar a partir do original').click();
  await wait(
    () =>
      document.querySelector('.pixel-comparison-panel') ||
      document.querySelector('input[aria-label="Alterar ruído"]')?.disabled ===
        false,
    'liberar exploração',
  );
  const noise = document.querySelector('input[aria-label="Alterar ruído"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
    noise,
    '16',
  );
  noise.dispatchEvent(new Event('input', { bubbles: true }));
  noise.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(
    () =>
      document.querySelectorAll('.pixel-pair-canvases .pixel-prediction')
        .length === 2,
    'inferência da imagem alterada',
  );
  const comparison = document.querySelectorAll('.pixel-pair-canvases canvas');
  check(
    pixels(comparison[0]) !== pixels(comparison[1]),
    'Ruído precisa alterar pixels reais.',
  );
  const sampleSelect = document.querySelector(
    'select[aria-label="Imagem em estudo"]',
  );
  const nextSample = Array.from(sampleSelect.options).find(
    (option) => option.value !== sampleSelect.value,
  );
  const nextSampleId = nextSample.value;
  sampleSelect.value = nextSampleId;
  sampleSelect.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(
    () =>
      document.querySelector('select[aria-label="Imagem em estudo"]').value ===
        nextSampleId &&
      document.querySelector('input[aria-label="Alterar ruído"]').value ===
        '0' &&
      document.querySelectorAll('.pixel-pair-canvases .pixel-prediction')
        .length === 2,
    'nova imagem sem contexto antigo',
  );
  fits();
  button('Modo apresentação').click();
  await wait(
    () => document.querySelector('.pixel-presentation'),
    'modo apresentação',
  );
  link('Voltar à rodada').click();
  await wait(() => document.querySelector('.pixel-reveal'), 'retorno ao jogo');
  for (let round = 2; round <= 5; round += 1) {
    button('Próxima imagem').click();
    await wait(
      () => document.querySelector('.pixel-game-image-pair canvas'),
      `rodada ${round}`,
    );
    changeBrightness(10);
    await wait(
      () => document.querySelector('.pixel-preview-status.is-pending'),
      'ajuste',
    );
    button('Testar ajustes').click();
    await wait(
      () =>
        document.querySelector(
          '.pixel-test-budget [aria-label="2 de 3 testes restantes"]',
        ) && !button('Analisando'),
      'consulta',
    );
    const confirmed = pixels(
      document.querySelector('.pixel-image-column.is-adjusted canvas'),
    );
    changeBrightness(30);
    await wait(
      () => button('Revelar último palpite testado'),
      'alteração pendente',
    );
    button('Revelar último palpite testado').click();
    await wait(() => document.querySelector('.pixel-reveal'), 'revelação');
    check(
      pixels(document.querySelectorAll('.pixel-reveal-grid canvas')[1]) ===
        confirmed,
      'Revelação usou pixels não testados.',
    );
    fits();
  }
  button('Ver placar final').click();
  await wait(() => document.querySelector('.pixel-scoreboard'), 'placar');
  check(
    document.querySelectorAll('.pixel-round-history article').length === 5,
    'Placar deve incluir cinco rodadas.',
  );
  const score = Number(
    document.querySelector('.pixel-final-score').firstChild.textContent,
  );
  check(score >= 0 && score <= 500 && score % 100 === 0, 'Pontuação inválida.');
  fits();
  button('Jogar novamente').click();
  await wait(
    () => document.querySelector('.pixel-game-image-pair canvas'),
    'reinício',
  );
  check(
    document.querySelector('.pixel-score strong').textContent === '0',
    'Reinício não zerou o placar.',
  );
  return {
    menu: true,
    instructions: true,
    threeRealQueries: true,
    privateOriginal: true,
    exactPixelsInLab: true,
    untestedChangesExcluded: true,
    fiveRounds: true,
    restart: true,
    labSections: visited,
    viewport: { width: innerWidth, height: innerHeight },
    score,
  };
}

async function main() {
  const executable =
    process.env.CHROME_BIN ||
    [
      '/snap/chromium/current/usr/lib/chromium-browser/chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
    ].find(existsSync);
  assert.ok(
    executable,
    'Defina CHROME_BIN com o caminho de um Chromium instalado.',
  );

  const server = process.env.PIXEL_URL ? null : await startDistServer();
  const baseUrl = process.env.PIXEL_URL || server.url;
  const profile = await mkdtemp(join(tmpdir(), 'pixel-browser-'));
  const browser = spawn(
    executable,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  const stop = () => {
    if (browser.exitCode === null) browser.kill('SIGTERM');
  };

  let ws;
  const pending = new Map();
  let serial = 0;
  const runtimeErrors = [];

  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        port = (
          await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
        ).split('\n')[0];
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.ok(port, 'O Chromium não iniciou o depurador.');
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) =>
      r.json(),
    );
    ws = new WebSocket(
      tabs.find((t) => t.type === 'page').webSocketDebuggerUrl,
    );
    await new Promise((resolvePromise, rejectPromise) => {
      ws.addEventListener('open', resolvePromise, { once: true });
      ws.addEventListener('error', rejectPromise, { once: true });
    });
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        runtimeErrors.push(
          message.params.exceptionDetails.exception?.description ||
            message.params.exceptionDetails.text,
        );
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(JSON.stringify(message.error)));
      else task.resolve(message.result);
    });

    const command = (method, params = {}) =>
      new Promise((resolvePromise, rejectPromise) => {
        const id = ++serial;
        const timer = setTimeout(() => {
          pending.delete(id);
          rejectPromise(new Error(`Tempo excedido: ${method}`));
        }, 45000);
        pending.set(id, {
          resolve: resolvePromise,
          reject: rejectPromise,
          timer,
        });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await mkdir('docs/pixel/remake', { recursive: true });
    const capture = async (name) => {
      const shot = await command('Page.captureScreenshot', { format: 'png' });
      await writeFile(
        `docs/pixel/remake/${name}.png`,
        Buffer.from(shot.data, 'base64'),
      );
    };
    const url = new URL('/pixel', baseUrl).href;
    await command('Page.navigate', { url });

    const desktopResult = await command('Runtime.evaluate', {
      expression: `(${exercisePixelApp.toString()})()`,
      awaitPromise: true,
      returnByValue: true,
    });
    assert.ok(
      !desktopResult.exceptionDetails,
      desktopResult.exceptionDetails?.exception?.description ||
        'Falha em /pixel desktop.',
    );

    await capture('game-desktop');
    await command('Page.navigate', { url });
    await command('Runtime.evaluate', {
      expression: `new Promise(resolve => { const t = setInterval(() => { if (document.querySelector('#pixel-hero-title')) { clearInterval(t); requestAnimationFrame(resolve); } }, 40); })`,
      awaitPromise: true,
    });
    await capture('menu-desktop');
    await command('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await command('Page.navigate', { url });
    const mobileResult = await command('Runtime.evaluate', {
      expression: `(${exercisePixelApp.toString()})()`,
      awaitPromise: true,
      returnByValue: true,
    });
    assert.ok(
      !mobileResult.exceptionDetails,
      mobileResult.exceptionDetails?.exception?.description || 'Falha mobile.',
    );
    await capture('game-mobile');
    assert.deepEqual(
      runtimeErrors,
      [],
      'Erros de execução durante as partidas.',
    );
    const report = {
      desktop: desktopResult.result.value,
      mobile: mobileResult.result.value,
      runtimeErrors,
    };
    await writeFile(
      'docs/pixel/remake/browser-check.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify(
        {
          desktop: desktopResult.result.value,
          mobile: mobileResult.result.value,
        },
        null,
        2,
      ),
    );
  } finally {
    for (const task of pending.values()) clearTimeout(task.timer);
    ws?.close();
    stop();
    if (server) await server.close();
    await new Promise((r) => setTimeout(r, 200));
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  await main();
}
