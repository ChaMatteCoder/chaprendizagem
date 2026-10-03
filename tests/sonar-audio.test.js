import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { attachSonarAudioGestures, createSonarSoundtrack, SONAR_TRACKS, sonarTrackForPath } from '../src/features/sonar/lib/audio/sonarSoundtrack.js';

function fakeAudio(playImpl) {
  const listeners = new Map();
  return {
    src: '', paused: true, currentTime: 0, plays: [], pauses: 0, loads: 0, listeners,
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    play() { this.plays.push(this.src); this.paused = false; return playImpl?.() ?? Promise.resolve(); },
    pause() { this.paused = true; this.pauses++; },
    removeAttribute(name) { if (name === 'src') this.src = ''; },
    load() { this.loads++; },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const namedError = name => Object.assign(new Error(name), { name });

test('músicas: menu, missão e laboratório usam faixas locais distintas e não reiniciam na mesma rota', async () => {
  const audio = fakeAudio(); let status;
  const music = createSonarSoundtrack(audio, value => { status = value; });
  assert.equal(sonarTrackForPath('/sonar/lab/'), 'lab');
  assert.equal(sonarTrackForPath('/sonar/missao/'), 'gameplay');
  for (const [path, key] of [['/sonar', 'menu'], ['/sonar/missao', 'gameplay'], ['/sonar/lab', 'lab']]) {
    music.setPath(path); await flush();
    assert.equal(audio.src, SONAR_TRACKS[key].src);
    assert.equal(status.track, key); assert.equal(status.playing, true);
    assert.equal(audio.loop, true); assert.equal(audio.volume, 0.3);
    const plays = audio.plays.length;
    audio.currentTime = 24; music.setPath(path);
    assert.equal(audio.currentTime, 24); assert.equal(audio.plays.length, plays);
  }
  music.dispose();
});

test('músicas: mute permanece nas três telas e gestos não o desfazem', async () => {
  const audio = fakeAudio(); let status;
  const music = createSonarSoundtrack(audio, value => { status = value; });
  music.setPath('/sonar'); await flush(); music.toggle();
  assert.equal(music.muted, true); assert.equal(audio.muted, true); assert.equal(audio.paused, true);
  const plays = audio.plays.length;
  for (const path of ['/sonar/missao', '/sonar/lab', '/sonar']) { music.setPath(path); music.activate(); }
  assert.equal(audio.plays.length, plays); assert.equal(status.playing, false);
  music.toggle(); await flush();
  assert.equal(audio.src, SONAR_TRACKS.menu.src); assert.equal(status.playing, true); assert.equal(status.muted, false);
  music.dispose();
});

test('músicas: autoplay bloqueado recupera no primeiro gesto sem erro permanente', async () => {
  let blocked = true, status;
  const audio = fakeAudio(() => blocked ? Promise.reject(namedError('NotAllowedError')) : Promise.resolve());
  const music = createSonarSoundtrack(audio, value => { status = value; });
  music.setPath('/sonar/lab'); await flush();
  assert.equal(status.blocked, true); assert.equal(status.failed, false);
  blocked = false; music.activate(); await flush();
  assert.equal(status.playing, true); assert.equal(status.blocked, false);
  music.dispose();
});

test('músicas: primeira interação supera autoplay pendente e ignora rejeição de faixa anterior', async () => {
  const requests = []; let status;
  const audio = fakeAudio(() => new Promise((resolve, reject) => requests.push({ resolve, reject })));
  const music = createSonarSoundtrack(audio, value => { status = value; });
  music.setPath('/sonar'); music.activate();
  assert.equal(requests.length, 2);
  requests[1].resolve(); await flush();
  requests[0].reject(namedError('NotAllowedError')); await flush();
  assert.equal(status.playing, true); assert.equal(status.blocked, false);
  music.setPath('/sonar/missao'); music.setPath('/sonar/lab');
  requests[3].resolve(); await flush(); requests[2].reject(namedError('NotSupportedError')); await flush();
  assert.equal(status.track, 'lab'); assert.equal(status.failed, false); assert.equal(status.playing, true);
  music.dispose();
});

test('músicas: arquivo inválido aceita retry e sair libera mídia/listeners e suprime callbacks pendentes', async () => {
  let status, reports = 0, resolve;
  const audio = fakeAudio();
  const music = createSonarSoundtrack(audio, value => { status = value; reports++; });
  music.setPath('/sonar'); await flush(); audio.listeners.get('error')();
  assert.equal(status.failed, true); assert.equal(status.playing, false);
  music.toggle(); await flush(); assert.equal(status.failed, false); assert.equal(status.playing, true);
  audio.play = () => new Promise(done => { resolve = done; });
  music.setPath('/sonar/lab'); music.dispose();
  const before = reports;
  resolve(); await flush(); music.dispose(); music.activate(); music.toggle();
  assert.equal(reports, before); assert.equal(audio.src, ''); assert.equal(audio.paused, true);
  assert.equal(audio.loads, 1); assert.equal(audio.listeners.size, 0);
});

test('músicas: touchend inicia durante o gesto, ignora o botão de som e remove todos os handlers', () => {
  const listeners = new Map(); let activations = 0;
  const target = {
    addEventListener(name, fn, options) { assert.equal(options.capture, true); listeners.set(name, fn); },
    removeEventListener(name, fn) { assert.equal(listeners.get(name), fn); listeners.delete(name); },
  };
  const detach = attachSonarAudioGestures(target, { activate() { activations++; } });
  listeners.get('touchend')({ target: { closest: () => null } });
  assert.equal(activations, 1);
  listeners.get('click')({ target: { closest: selector => selector === '[data-sonar-sound-toggle]' } });
  assert.equal(activations, 1); detach(); assert.equal(listeners.size, 0);
});

test('mídia: capa e três músicas preservam os bytes fornecidos pelo usuário', async () => {
  const expected = {
    'images/sonar/cover.png': '0c67aba94be152d0e16322e263bf8e3e2d8daeffd11de4bc31dd911ff0c9f1b7',
    'audio/sonar/menu.mp3': '467cde7a852e0c206594ce9f267e619bf270a1f990e345bada7ae21ead4b5fd1',
    'audio/sonar/gameplay.mp3': '9e1a97ea93a3a2c5877ba88949ae7723c634d385f07dd45344121d40cc753063',
    'audio/sonar/lab.mp3': '727c0178cfd45f373def4394ce0e12c82ae0bf21e3a86ae3cbaa5e0b34a35688',
  };
  for (const [file, hash] of Object.entries(expected)) {
    const bytes = await readFile(new URL(`../public/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
  }
});
