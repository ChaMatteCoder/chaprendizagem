import test from 'node:test';
import assert from 'node:assert/strict';
import { preprocessStrokes } from '../src/features/iadivinha/lib/preprocessStrokes.js';
import { preprocessDrawing } from '../src/features/iadivinha/lib/preprocessDrawing.js';
const strokes = [{width:4,points:[{x:0,y:0},{x:50,y:0},{x:50,y:100}]}];
test('Traços: escala, posição e pincel preservam a entrada normalizada; sem mutação', () => {
  const before=JSON.stringify(strokes), a=preprocessStrokes(strokes);
  const shifted=strokes.map(s=>({width:18,points:s.points.map(p=>({x:p.x*3+70,y:p.y*3+30}))}));
  assert.deepEqual(a.pixels,preprocessStrokes(shifted).pixels);
  assert.deepEqual(a.pixels,preprocessDrawing({strokes}).pixels);
  assert.equal(JSON.stringify(strokes),before);
  assert.equal(a.pixels.length,784);assert.ok(a.pixels.some(x=>x===1));
  for(const x of a.pixels)assert.ok(x>=0 && x<=1);
});
test('Traços: vazio e coordenadas inválidas são rejeitados; ponto e borda continuam visíveis', () => {
  assert.throws(()=>preprocessStrokes([]),/vazia/);
  assert.throws(()=>preprocessStrokes([{points:[{x:NaN,y:0}]}]),/inválidos/);
  assert.ok(preprocessStrokes([{points:[{x:560,y:560}]}]).pixels.some(x=>x>0));
});
