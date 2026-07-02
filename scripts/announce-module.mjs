function readArguments(values) {
  return values.reduce((result, argument) => {
    if (!argument.startsWith('--') || !argument.includes('=')) {
      return result;
    }

    const [key, ...valueParts] = argument.slice(2).split('=');
    result[key] = valueParts.join('=');
    return result;
  }, {});
}

const options = readArguments(process.argv.slice(2));
const siteUrl = options.endpoint
  ? options.endpoint.replace(/\/api\/newsletter\/announce\/?$/, '')
  : process.env.NEWSLETTER_SITE_URL?.replace(/\/$/, '');
const endpoint = options.endpoint || (siteUrl ? `${siteUrl}/api/newsletter/announce` : '');
const secret = process.env.NEWSLETTER_ANNOUNCE_SECRET;
const required = ['slug', 'title', 'description', 'url'];
const missing = required.filter((name) => !options[name]);

if (!endpoint || !secret || missing.length > 0) {
  console.error(
    [
      'Não foi possível preparar o anúncio.',
      !endpoint ? 'Defina NEWSLETTER_SITE_URL ou use --endpoint=URL.' : '',
      !secret ? 'Defina NEWSLETTER_ANNOUNCE_SECRET.' : '',
      missing.length ? `Argumentos ausentes: ${missing.join(', ')}.` : '',
      '',
      'Exemplo:',
      'npm run newsletter:announce -- --slug=iris --title="Classificação Iris" --description="Novo laboratório interativo." --url=/mlp/classificacao-iris',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exitCode = 1;
} else {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      slug: options.slug,
      title: options.title,
      description: options.description,
      url: options.url,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(result.message || `Falha ao criar anúncio (${response.status}).`);
    process.exitCode = 1;
  } else {
    console.log(`${result.message} Broadcast: ${result.broadcastId}. Modo: ${result.mode}.`);
  }
}
