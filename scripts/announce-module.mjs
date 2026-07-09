import {
  defaultModuleAnnouncementSlug,
  getModuleAnnouncementPreset,
  listModuleAnnouncementPresets,
} from '../server/moduleAnnouncements.js';

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
const hasAnnouncementArguments = required.some((name) => options[name]);
const presetKey =
  options.preset ||
  options.module ||
  (!options.title || !options.description || !options.url ? options.slug : '') ||
  (!options.slug || !options.title || !options.description ? options.url : '') ||
  (!hasAnnouncementArguments ? defaultModuleAnnouncementSlug : '');
const preset = presetKey ? getModuleAnnouncementPreset(presetKey) : null;
const announcement = {
  slug: options.slug || preset?.slug,
  title: options.title || preset?.title,
  description: options.description || preset?.description,
  url: options.url || preset?.url,
};
const missing = required.filter((name) => !announcement[name]);
const availablePresets = listModuleAnnouncementPresets()
  .map(({ slug, title, url }) => `${slug} (${title}, ${url})`)
  .join(', ');
const presetError = presetKey && !preset && missing.length > 0;

if (!endpoint || !secret || missing.length > 0 || presetError) {
  console.error(
    [
      'Não foi possível preparar o anúncio.',
      !endpoint ? 'Defina NEWSLETTER_SITE_URL ou use --endpoint=URL.' : '',
      !secret ? 'Defina NEWSLETTER_ANNOUNCE_SECRET.' : '',
      presetError ? `Preset não encontrado: ${presetKey}.` : '',
      missing.length ? `Argumentos ausentes: ${missing.join(', ')}.` : '',
      `Presets disponíveis: ${availablePresets}.`,
      'Com NEWSLETTER_SEND_ENABLED=false, o endpoint cria apenas um rascunho no Resend.',
      '',
      'Exemplo:',
      'npm run newsletter:announce',
      'npm run newsletter:announce -- --preset=kmeans',
      'npm run newsletter:announce -- --slug=meu-modulo --title="Meu Módulo" --description="Resumo do lançamento." --url=/meu-modulo',
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
      slug: announcement.slug,
      title: announcement.title,
      description: announcement.description,
      url: announcement.url,
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
