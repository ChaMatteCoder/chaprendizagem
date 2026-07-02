import {
  buildModuleBroadcast,
  createResendClient,
  getNewsletterConfig,
  NewsletterConfigurationError,
  readRequestBody,
  secretsMatch,
} from '../../server/newsletter.js';

function getBearerToken(request) {
  const authorization = request.headers.authorization ?? '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const config = getNewsletterConfig({ includeAnnouncementSecret: true });

    if (!secretsMatch(getBearerToken(request), config.announceSecret)) {
      return response.status(401).json({ message: 'Não autorizado.' });
    }

    const body = readRequestBody(request);
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const modulePath = typeof body.url === 'string' ? body.url.trim() : '';

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      !title ||
      title.length > 120 ||
      !description ||
      description.length > 600 ||
      !modulePath
    ) {
      return response.status(400).json({ message: 'Informe slug, título, descrição e URL válidos.' });
    }

    const moduleUrl = new URL(modulePath, config.siteUrl);

    if (moduleUrl.origin !== new URL(config.siteUrl).origin) {
      return response.status(400).json({ message: 'A URL do módulo precisa pertencer ao Chaprendizagem.' });
    }

    const broadcast = buildModuleBroadcast({ title, description, moduleUrl: moduleUrl.toString() });
    const resend = createResendClient(config.apiKey);
    const { data, error } = await resend.broadcasts.create(
      {
        segmentId: config.segmentId,
        from: config.from,
        replyTo: config.replyTo,
        name: `module-${slug}`,
        send: config.sendEnabled,
        ...broadcast,
      },
      { idempotencyKey: `module-announcement-${slug}` },
    );

    if (error) {
      console.error('Falha ao criar broadcast:', error);
      return response.status(502).json({ message: 'Não foi possível criar o anúncio no Resend.' });
    }

    return response.status(201).json({
      broadcastId: data.id,
      mode: config.sendEnabled ? 'sent' : 'draft',
      message: config.sendEnabled ? 'Campanha enviada.' : 'Rascunho criado com segurança.',
    });
  } catch (error) {
    if (error instanceof NewsletterConfigurationError) {
      console.error(error.message);
      return response.status(503).json({ message: 'A newsletter ainda não foi configurada neste ambiente.' });
    }

    console.error('Erro inesperado ao anunciar módulo:', error);
    return response.status(500).json({ message: 'Não foi possível processar o anúncio.' });
  }
}
