import {
  buildConfirmationEmail,
  createConfirmationToken,
  createResendClient,
  emailFingerprint,
  getNewsletterConfig,
  isValidEmail,
  NewsletterConfigurationError,
  normalizeEmail,
  readRequestBody,
} from '../../server/newsletter.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const body = readRequestBody(request);

    if (body.company) {
      return response.status(202).json({
        message: 'Se o endereço for válido, você receberá um e-mail de confirmação.',
      });
    }

    const email = normalizeEmail(body.email);

    if (!isValidEmail(email)) {
      return response.status(400).json({ message: 'Informe um endereço de e-mail válido.' });
    }

    const config = getNewsletterConfig();
    const token = createConfirmationToken(email, config.tokenSecret);
    const confirmationUrl = `${config.siteUrl}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
    const confirmationEmail = buildConfirmationEmail({ confirmationUrl });
    const resend = createResendClient(config.apiKey);
    const { error } = await resend.emails.send(
      {
        from: config.from,
        to: email,
        replyTo: config.replyTo,
        ...confirmationEmail,
      },
      { idempotencyKey: `newsletter-confirm-${emailFingerprint(email)}` },
    );

    if (error) {
      console.error('Falha ao enviar confirmação da newsletter:', error);
      return response.status(502).json({ message: 'Não foi possível enviar a confirmação agora. Tente novamente.' });
    }

    return response.status(202).json({
      message: 'Enviamos um link de confirmação. Verifique sua caixa de entrada.',
    });
  } catch (error) {
    if (error instanceof NewsletterConfigurationError) {
      console.error(error.message);
      return response.status(503).json({
        code: 'NEWSLETTER_NOT_CONFIGURED',
        message: 'A newsletter ainda não foi configurada neste ambiente.',
      });
    }

    console.error('Erro inesperado ao assinar newsletter:', error);
    return response.status(500).json({ message: 'Não foi possível processar a inscrição agora.' });
  }
}
