import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class NewsletterConfigurationError extends Error {
  constructor(missingVariables) {
    super(`Newsletter não configurada. Variáveis ausentes: ${missingVariables.join(', ')}`);
    this.name = 'NewsletterConfigurationError';
    this.missingVariables = missingVariables;
  }
}

export function getNewsletterConfig({ includeAnnouncementSecret = false } = {}) {
  const requiredNames = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_NEWSLETTER_SEGMENT_ID',
    'NEWSLETTER_SITE_URL',
    'NEWSLETTER_TOKEN_SECRET',
  ];

  if (includeAnnouncementSecret) {
    requiredNames.push('NEWSLETTER_ANNOUNCE_SECRET');
  }

  const missingVariables = requiredNames.filter((name) => !process.env[name]?.trim());

  if (missingVariables.length > 0) {
    throw new NewsletterConfigurationError(missingVariables);
  }

  return {
    apiKey: process.env.RESEND_API_KEY.trim(),
    announceSecret: process.env.NEWSLETTER_ANNOUNCE_SECRET?.trim() ?? '',
    from: process.env.RESEND_FROM_EMAIL.trim(),
    replyTo: process.env.RESEND_REPLY_TO?.trim() || undefined,
    segmentId: process.env.RESEND_NEWSLETTER_SEGMENT_ID.trim(),
    sendEnabled: process.env.NEWSLETTER_SEND_ENABLED?.toLowerCase() === 'true',
    siteUrl: process.env.NEWSLETTER_SITE_URL.trim().replace(/\/$/, ''),
    tokenSecret: process.env.NEWSLETTER_TOKEN_SECRET.trim(),
  };
}

export function createResendClient(apiKey) {
  return new Resend(apiKey);
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createConfirmationToken(email, secret, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email: normalizeEmail(email), expiresAt: now + TOKEN_TTL_MS, version: 1 }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');

  return `${payload}.${signature}`;
}

export function verifyConfirmationToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [payload, receivedSignature, ...extra] = token.split('.');

  if (!payload || !receivedSignature || extra.length > 0) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url');
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    if (
      parsed.version !== 1 ||
      !isValidEmail(parsed.email) ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return null;
    }

    return { email: normalizeEmail(parsed.email), expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function secretsMatch(provided, expected) {
  if (!provided || !expected) {
    return false;
  }

  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(providedHash, expectedHash);
}

export function emailFingerprint(email) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 24);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildConfirmationEmail({ confirmationUrl }) {
  const safeUrl = escapeHtml(confirmationUrl);

  return {
    subject: 'Confirme sua inscrição no Chaprendizagem',
    text: [
      'Você pediu para receber novidades do Chaprendizagem.',
      '',
      `Confirme sua inscrição acessando: ${confirmationUrl}`,
      '',
      'Este link expira em 24 horas. Se você não fez esta solicitação, ignore esta mensagem.',
    ].join('\n'),
    html: `
      <div style="background:#f4f6f2;padding:36px 18px;font-family:Arial,sans-serif;color:#171b1d">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d9dfd8;border-radius:12px;overflow:hidden">
          <div style="background:#0d4548;padding:28px 32px;color:#ffffff">
            <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9fd3cd">Chaprendizagem</div>
            <h1 style="font-size:30px;line-height:1.1;margin:14px 0 0">Só falta confirmar.</h1>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;line-height:1.65;color:#626b67;margin-top:0">Você pediu para receber novidades sobre módulos, artigos e atualizações do laboratório.</p>
            <a href="${safeUrl}" style="display:inline-block;background:#00575b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:8px;margin:10px 0 22px">Confirmar inscrição</a>
            <p style="font-size:13px;line-height:1.6;color:#7b8380;margin-bottom:0">O link expira em 24 horas. Se você não fez esta solicitação, pode ignorar esta mensagem.</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function buildModuleBroadcast({ title, description, moduleUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(moduleUrl);

  return {
    subject: `Novo experimento: ${title}`,
    previewText: `${title} já está disponível no Chaprendizagem.`,
    text: [
      `Novo experimento: ${title}`,
      '',
      description,
      '',
      `Explorar: ${moduleUrl}`,
      '',
      'Cancelar inscrição: {{{RESEND_UNSUBSCRIBE_URL}}}',
    ].join('\n'),
    html: `
      <div style="background:#f4f6f2;padding:36px 18px;font-family:Arial,sans-serif;color:#171b1d">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9dfd8;border-radius:12px;overflow:hidden">
          <div style="background:#0d4548;padding:30px 34px;color:#ffffff">
            <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9fd3cd">Novo no laboratório</div>
            <h1 style="font-size:32px;line-height:1.08;margin:14px 0 0">${safeTitle}</h1>
          </div>
          <div style="padding:34px">
            <p style="font-size:16px;line-height:1.7;color:#626b67;margin-top:0">${safeDescription}</p>
            <a href="${safeUrl}" style="display:inline-block;background:#00575b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:8px;margin:10px 0 28px">Explorar experimento</a>
            <p style="border-top:1px solid #d9dfd8;padding-top:20px;font-size:12px;color:#7b8380;margin-bottom:0">Você recebeu esta mensagem porque confirmou sua inscrição no Chaprendizagem. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#00575b">Cancelar inscrição</a>.</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function readRequestBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body);
  }

  return request.body;
}
