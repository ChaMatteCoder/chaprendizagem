import assert from 'node:assert/strict';
import test from 'node:test';
import { createAtelierAudio } from '../src/features/enganai/lib/atelierAudio.js';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, PROGRESS_KEY, readMissionProgress, readPreferences, writePreferences } from '../src/features/enganai/lib/atelierPreferences.js';
import { missions } from '../src/features/enganai/data/atelier.js';

function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
}

test('preferências persistem sem modificar dados de outro formato ou JSON danificado', () => {
  for (const raw of ['{"schemaVersion":2}', '{invalid', JSON.stringify({ ...DEFAULT_PREFERENCES, dataMode: 'fixture' })]) {
    const storage = memoryStorage({ [PREFERENCES_KEY]: raw });
    const { value, persistence } = readPreferences(storage);
    assert.equal(persistence, 'incompatible');
    assert.equal(writePreferences(storage, { ...value, motion: 'reduced' }, persistence), 'incompatible');
    assert.equal(storage.getItem(PREFERENCES_KEY), raw);
  }
  const storage = memoryStorage();
  assert.equal(readPreferences(storage).value.soundEnabled, false);
  const value = { ...DEFAULT_PREFERENCES, explanation: 'technical', motion: 'reduced' };
  assert.equal(writePreferences(storage, value, 'ready'), 'ready');
  assert.deepEqual(readPreferences(storage).value, value);
});

test('navegação continua com ajustes em memória quando o armazenamento está bloqueado', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readPreferences(storage).persistence, 'unavailable');
  assert.equal(writePreferences(storage, DEFAULT_PREFERENCES, 'unavailable'), 'unavailable');
  assert.deepEqual(readMissionProgress(storage, missions).completed, []);
});

const recordedProgress = () => ({
  schemaVersion: 1, kind: 'progress', dataMode: 'recorded',
  completedMissionIds: ['primeiros-rastros'],
  missions: [{ missionId: 'primeiros-rastros', bestScore: 300, bestCorrect: 3, completions: 1 }],
  badges: ['first-mission'], completedSessionIds: ['session-1'],
});

test('mural lê apenas conclusões coerentes e preserva os registros rejeitados', () => {
  const good = recordedProgress();
  const storage = memoryStorage({ [PROGRESS_KEY]: JSON.stringify(good) });
  assert.deepEqual(readMissionProgress(storage, missions), { completed: ['primeiros-rastros'], persistence: 'ready' });
  const invalid = [
    { ...good, dataMode: 'fixture' },
    { ...good, completedMissionIds: ['novos-padroes'], missions: [{ ...good.missions[0], missionId: 'novos-padroes' }] },
    { ...good, completedSessionIds: ['session-1', 'session-1'] },
    { ...good, missions: [{ ...good.missions[0], bestScore: 400 }] },
    { ...good, badges: ['all-missions'] },
  ];
  for (const value of invalid) {
    const raw = JSON.stringify(value);
    const rejected = memoryStorage({ [PROGRESS_KEY]: raw });
    assert.deepEqual(readMissionProgress(rejected, missions).completed, []);
    assert.equal(rejected.getItem(PROGRESS_KEY), raw);
  }
});

function audioFixture({ pending = false, failure = false } = {}) {
  const contexts = [];
  let resolve;
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.levels = []; this.stopped = 0; this.closed = false; contexts.push(this); }
    createGain() { return { gain: { value: 0, cancelScheduledValues() {}, setTargetAtTime: level => this.levels.push(level) }, connect() {} }; }
    createBiquadFilter() { return { frequency: { value: 0 }, connect() {} }; }
    createOscillator() { return { frequency: { value: 0 }, connect() {}, start() {}, stop: () => this.stopped++ }; }
    async resume() { if (failure) throw new Error('denied'); if (pending) await new Promise(done => { resolve = done; }); this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.closed = true; this.state = 'closed'; }
  }
  return { AudioContext, contexts, resume: () => resolve() };
}

test('áudio é criado após ação e a saída do módulo libera os recursos', async () => {
  const fixture = audioFixture();
  const audio = createAtelierAudio(fixture.AudioContext);
  assert.equal(fixture.contexts.length, 0);
  assert.equal(await audio.start(), true);
  assert.deepEqual(fixture.contexts[0].levels, [0.012]);
  audio.stop();
  assert.equal(fixture.contexts[0].levels.at(-1), 0);
  audio.dispose();
  assert.equal(fixture.contexts[0].closed, true);
  assert.equal(fixture.contexts[0].stopped, 2);
  assert.equal(await audio.start(), false);
});

test('retorno tardio de áudio cancelado não liga o som; falha não impede exploração', async () => {
  for (const operation of ['stop', 'dispose']) {
    const fixture = audioFixture({ pending: true });
    const audio = createAtelierAudio(fixture.AudioContext);
    const starting = audio.start();
    audio[operation](); fixture.resume();
    assert.equal(await starting, false);
    assert.equal(fixture.contexts[0].levels.includes(0.012), false);
    if (operation === 'stop') assert.equal(fixture.contexts[0].state, 'suspended');
    audio.dispose();
  }
  const fixture = audioFixture({ failure: true });
  const audio = createAtelierAudio(fixture.AudioContext);
  assert.equal(await audio.start(), false);
  audio.dispose();
  assert.equal(await createAtelierAudio(undefined).start(), false);
});
