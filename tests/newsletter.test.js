import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildModuleBroadcast,
  createConfirmationToken,
  isValidEmail,
  normalizeEmail,
  verifyConfirmationToken,
} from '../server/newsletter.js';
import subscribeHandler from '../api/newsletter/subscribe.js';
import announceHandler from '../api/newsletter/announce.js';

const secret = 'um-segredo-de-teste-com-tamanho-suficiente';
const now = new Date('2026-07-02T12:00:00Z').getTime();

test('normaliza e valida endereços de e-mail', () => {
  assert.equal(normalizeEmail('  Pessoa@Exemplo.COM '), 'pessoa@exemplo.com');
  assert.equal(isValidEmail('pessoa@exemplo.com'), true);
  assert.equal(isValidEmail('email-invalido'), false);
});

test('aceita um token íntegro dentro do prazo', () => {
  const token = createConfirmationToken('pessoa@exemplo.com', secret, now);
  const result = verifyConfirmationToken(token, secret, now + 60_000);

  assert.equal(result.email, 'pessoa@exemplo.com');
  assert.ok(result.expiresAt > now);
});

test('rejeita tokens adulterados ou expirados', () => {
  const token = createConfirmationToken('pessoa@exemplo.com', secret, now);
  const [payload, signature] = token.split('.');

  assert.equal(verifyConfirmationToken(`${payload}.${signature}x`, secret, now), null);
  assert.equal(verifyConfirmationToken(token, secret, now + 25 * 60 * 60 * 1000), null);
});

test('gera campanha com descadastro e conteúdo escapado', () => {
  const broadcast = buildModuleBroadcast({
    title: 'Iris <MLP>',
    description: 'Classificação & métricas',
    moduleUrl: 'https://example.com/mlp/iris',
  });

  assert.match(broadcast.html, /Iris &lt;MLP&gt;/);
  assert.match(broadcast.html, /Classificação &amp; métricas/);
  assert.match(broadcast.html, /RESEND_UNSUBSCRIBE_URL/);
  assert.match(broadcast.text, /RESEND_UNSUBSCRIBE_URL/);
});

function createResponseMock() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('endpoint de inscrição rejeita método e e-mail inválidos antes de chamar o provedor', async () => {
  const methodResponse = createResponseMock();
  await subscribeHandler({ method: 'GET' }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);

  const emailResponse = createResponseMock();
  await subscribeHandler({ method: 'POST', body: { email: 'invalido' } }, emailResponse);
  assert.equal(emailResponse.statusCode, 400);
  assert.match(emailResponse.payload.message, /válido/);
});

test('endpoint de anúncio exige autenticação e conteúdo válido', async () => {
  const testEnvironment = {
    RESEND_API_KEY: 're_teste',
    RESEND_FROM_EMAIL: 'Chaprendizagem <teste@example.com>',
    RESEND_NEWSLETTER_SEGMENT_ID: 'segmento_teste',
    NEWSLETTER_SITE_URL: 'https://chaprendizagem.example',
    NEWSLETTER_TOKEN_SECRET: 'segredo-de-token-com-mais-de-trinta-caracteres',
    NEWSLETTER_ANNOUNCE_SECRET: 'segredo-de-anuncio-com-mais-de-trinta-caracteres',
  };
  const previousValues = Object.fromEntries(
    Object.keys(testEnvironment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, testEnvironment);

  try {
    const unauthorizedResponse = createResponseMock();
    await announceHandler({ method: 'POST', headers: {}, body: {} }, unauthorizedResponse);
    assert.equal(unauthorizedResponse.statusCode, 401);

    const invalidResponse = createResponseMock();
    await announceHandler(
      {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.NEWSLETTER_ANNOUNCE_SECRET}` },
        body: { slug: 'slug-invalido!' },
      },
      invalidResponse,
    );
    assert.equal(invalidResponse.statusCode, 400);
  } finally {
    Object.entries(previousValues).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
});
