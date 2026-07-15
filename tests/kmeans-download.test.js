import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadRechartsPng } from '../src/features/kmeans/lib/downloadRechartsPng.js';

test('exportador compartilhado gera canvas e dispara download PNG com o nome solicitado', async () => {
  const calls = { attributes: {}, clicked: false, drawn: false, revoked: [], urls: [] };
  const originalGlobals = {
    XMLSerializer: globalThis.XMLSerializer,
    Image: globalThis.Image,
    document: globalThis.document,
    window: globalThis.window,
  };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  const svgClone = {
    setAttribute(name, value) { calls.attributes[name] = value; },
  };
  const chartContainer = {
    querySelector(selector) {
      assert.equal(selector, '.recharts-wrapper svg');
      return {
        cloneNode() { return svgClone; },
        getBoundingClientRect() { return { width: 640, height: 360 }; },
      };
    },
  };

  globalThis.XMLSerializer = class {
    serializeToString(node) {
      assert.equal(node, svgClone);
      return '<svg />';
    }
  };
  globalThis.Image = class {
    set src(value) {
      calls.imageSource = value;
      queueMicrotask(() => this.onload());
    }
  };
  globalThis.window = { devicePixelRatio: 2 };
  globalThis.document = {
    body: {
      appendChild(anchor) { calls.anchor = anchor; },
    },
    createElement(tagName) {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              scale(x, y) { calls.scale = [x, y]; },
              fillRect(x, y, width, height) { calls.fillRect = [x, y, width, height]; },
              drawImage() { calls.drawn = true; },
              set fillStyle(value) { calls.background = value; },
            };
          },
          toBlob(callback, mimeType) {
            calls.mimeType = mimeType;
            callback(new Blob(['png'], { type: mimeType }));
          },
        };
      }

      if (tagName === 'a') {
        return {
          click() { calls.clicked = true; },
          remove() { calls.removed = true; },
        };
      }

      throw new Error(`Elemento inesperado: ${tagName}`);
    },
  };
  URL.createObjectURL = (blob) => {
    const url = `blob:teste-${calls.urls.length + 1}`;
    calls.urls.push({ blob, url });
    return url;
  };
  URL.revokeObjectURL = (url) => calls.revoked.push(url);

  try {
    assert.equal(downloadRechartsPng(chartContainer, 'trabalho-11-comparacao-eqt.png'), true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(calls.clicked, true);
    assert.equal(calls.removed, true);
    assert.equal(calls.anchor.download, 'trabalho-11-comparacao-eqt.png');
    assert.equal(calls.anchor.href, 'blob:teste-2');
    assert.equal(calls.drawn, true);
    assert.equal(calls.mimeType, 'image/png');
    assert.deepEqual(calls.scale, [2, 2]);
    assert.deepEqual(calls.fillRect, [0, 0, 640, 360]);
    assert.equal(calls.background, '#ffffff');
    assert.deepEqual(calls.attributes, {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '640',
      height: '360',
      viewBox: '0 0 640 360',
    });
    assert.deepEqual(calls.revoked, ['blob:teste-1', 'blob:teste-2']);
  } finally {
    globalThis.XMLSerializer = originalGlobals.XMLSerializer;
    globalThis.Image = originalGlobals.Image;
    globalThis.document = originalGlobals.document;
    globalThis.window = originalGlobals.window;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});
