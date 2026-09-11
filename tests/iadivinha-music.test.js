import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundtrack, MUSIC_TRACKS } from '../src/features/iadivinha/lib/soundtrack.js';
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
function fakeAudio() {
  return { plays: 0, pauses: 0, events: {}, play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; }, addEventListener(name, callback) { this.events[name] = callback; }, removeEventListener(name) { delete this.events[name]; }, removeAttribute() { this.src = ''; }, load() {} };
}
test('Trilha: tenta autoplay com som, ignora mute antigo, mantém faixa nas rodadas e final toca uma vez', async () => {
  const audio = fakeAudio(); const music = createSoundtrack(audio, { getItem: () => 'true' });
  music.setPhase('home'); assert.equal(audio.src, MUSIC_TRACKS.menu); assert.equal(audio.plays, 1); assert.equal(audio.muted, false); assert.equal(audio.loop, true);
  await tick(); music.activate(); assert.equal(audio.plays, 1);
  music.setPhase('preparing'); await tick();
  const plays = audio.plays;
  for (const phase of ['revealing','drawing','processing','result','error','preparing']) music.setPhase(phase);
  assert.equal(audio.plays, plays);
  music.toggle(); assert.equal(audio.muted, true);
  music.setPhase('finished'); assert.equal(audio.src, MUSIC_TRACKS.finale); assert.equal(audio.loop, false); assert.equal(audio.plays, plays);
  music.toggle(); await tick(); assert.equal(audio.plays, plays + 1);
  audio.events.ended(); music.toggle(); music.toggle(); music.activate(); music.setPhase('finished');
  assert.equal(audio.plays, plays + 1);
  music.setPhase('home'); await tick(); assert.equal(audio.loop, true);
  music.setPhase('finished'); await tick(); assert.equal(audio.plays, plays + 3); assert.equal(audio.loop, false);
  music.dispose(); assert.deepEqual(audio.events, {}); assert.equal(audio.src, '');
});
test('Trilha: bloqueio de autoplay é recuperado pelo primeiro gesto; falha antiga não afeta a faixa nova', async () => {
  const audio = fakeAudio(); let status, rejectOld;
  audio.play = () => Promise.reject(Object.assign(new Error('gesture required'), {name:'NotAllowedError'}));
  const music = createSoundtrack(audio, null, value => { status = value; });
  music.setPhase('home'); await tick(); assert.equal(status.blocked, true); assert.equal(status.muted, false); assert.equal(status.failed, false);
  audio.play = () => Promise.resolve(); music.activate(); await tick(); assert.equal(status.activated, true); assert.equal(status.blocked, false);
  audio.play = () => new Promise((_, reject) => { rejectOld = reject; }); music.setPhase('drawing');
  audio.play = () => Promise.resolve(); music.setPhase('finished'); await tick();
  rejectOld(new Error('stale error')); await tick(); assert.equal(status.failed, false);
  music.toggle(); music.activate(); assert.equal(audio.muted, true); music.dispose();
});
