import {
  createResendClient,
  getNewsletterConfig,
  NewsletterConfigurationError,
  verifyConfirmationToken,
} from '../../server/newsletter.js';

function redirectToResult(response, siteUrl, status) {
  return response.redirect(303, `${siteUrl}/?newsletter=${status}#contato-rapido`);
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  let config;

  try {
    config = getNewsletterConfig();
    const tokenData = verifyConfirmationToken(request.query.token, config.tokenSecret);

    if (!tokenData) {
      return redirectToResult(response, config.siteUrl, 'invalid');
    }

    const resend = createResendClient(config.apiKey);
    const { error } = await resend.contacts.create({
      email: tokenData.email,
      unsubscribed: false,
      segments: [{ id: config.segmentId }],
    });

    if (error?.statusCode === 409) {
      const { error: updateError } = await resend.contacts.update({
        email: tokenData.email,
        unsubscribed: false,
      });

      if (updateError) {
        throw updateError;
      }

      const { error: segmentError } = await resend.contacts.segments.add({
        email: tokenData.email,
        segmentId: config.segmentId,
      });

      if (segmentError && segmentError.statusCode !== 409) {
        throw segmentError;
      }
    } else if (error) {
      throw error;
    }

    return redirectToResult(response, config.siteUrl, 'confirmed');
  } catch (error) {
    if (error instanceof NewsletterConfigurationError) {
      console.error(error.message);
      return response.status(503).json({ message: 'A newsletter ainda não foi configurada neste ambiente.' });
    }

    console.error('Falha ao confirmar inscrição:', error);
    return redirectToResult(response, config?.siteUrl ?? '/', 'error');
  }
}
