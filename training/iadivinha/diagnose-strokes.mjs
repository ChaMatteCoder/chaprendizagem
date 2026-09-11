import { readFile, writeFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { preprocessDrawing } from '../../src/features/iadivinha/lib/preprocessDrawing.js';
import { preprocessStrokes, rasterizePaths } from '../../src/features/iadivinha/lib/preprocessStrokes.js';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const root = 'public/models/iadivinha/';
const classes = await read(root+'classes.json'), artifact = await read(root+'model.json'), bin = await readFile(root+'weights.bin');
await tf.setBackend('cpu');
const model = await tf.loadLayersModel(tf.io.fromMemory({modelTopology:artifact.modelTopology,weightSpecs:artifact.weightsManifest.flatMap(g=>g.weights),weightData:bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength)}));
const vectors = await read('training/iadivinha/runs/stroke-diagnostic/vectors.json');
const report = { source:'Quick Draw simplified vectors, first 30 per class; diagnostic, not an independent human-game test', canvas:'Equivalent to 440px drawing extent and 8px default brush on a 560px canvas, rendered at quarter scale with supersampling', count:vectors.length, before:{correct:0,catAsBread:0,byClass:{}}, normalized:{correct:0,catAsBread:0,byClass:{}} };
for (const sample of vectors) {
 const paths = sample.drawing.map(([xs,ys])=>xs.map((x,i)=>({x,y:ys[i]})));
 const points=paths.flat();
 const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
 const w=Math.max(...points.map(p=>p.x))-left,h=Math.max(...points.map(p=>p.y))-top,scale=110/Math.max(w,h,1);
 const native=paths.map(path=>path.map(p=>({x:70+(p.x-left-w/2)*scale,y:70+(p.y-top-h/2)*scale})));
 const thin=rasterizePaths(native,140,1,4);
 const image={width:140,height:140,data:new Uint8ClampedArray(140*140*4).fill(255)};
 for(let i=0;i<thin.length;i++)for(let c=0;c<3;c++)image.data[i*4+c]=Math.round(255-(255-[23,42,45][c])*thin[i]);
 for(const [key,pixels] of [['before',preprocessDrawing(image).pixels],['normalized',preprocessStrokes(paths.map(points=>({points}))).pixels]]) {
  const out=tf.tidy(()=>model.predict(tf.tensor4d(pixels,[1,28,28,1])));const values=Array.from(await out.data());out.dispose();
  const predicted=classes[values.indexOf(Math.max(...values))].id;
  const r=report[key];r.byClass[sample.id]??={correct:0,total:0,predictions:{}};
  const cls=r.byClass[sample.id];cls.total++;cls.predictions[predicted]=(cls.predictions[predicted]||0)+1;
  if(predicted===sample.id){r.correct++;cls.correct++;}
  if(sample.id==='cat' && predicted==='bread')r.catAsBread++;
 }
}
model.dispose();
await writeFile('docs/iadivinha/training/eight-class/stroke-diagnostic.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
