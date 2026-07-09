export const defaultModuleAnnouncementSlug = 'kmeans';

export const moduleAnnouncements = {
  kmeans: {
    slug: 'kmeans',
    title: 'K-Means',
    description:
      'Novo laboratório interativo de aprendizagem não supervisionada com centroides, clusters, curva EQT e análise do cotovelo.',
    url: '/kmeans',
  },
  iris: {
    slug: 'iris',
    title: 'Classificação Iris',
    description: 'Laboratório interativo de classificação multiclasse com uma MLP aplicada a dados tabulares.',
    url: '/mlp/classificacao-iris',
  },
};

function normalizePresetKey(value) {
  if (typeof value !== 'string') return '';

  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/^mlp\//, '')
    .replace(/^classificacao-/, '');
}

export function getModuleAnnouncementPreset(value = defaultModuleAnnouncementSlug) {
  const normalized = normalizePresetKey(value);
  const bySlug = moduleAnnouncements[normalized];

  if (bySlug) return bySlug;

  return Object.values(moduleAnnouncements).find((announcement) => {
    const normalizedUrl = normalizePresetKey(announcement.url);
    return normalizedUrl === normalized || announcement.url === value;
  }) ?? null;
}

export function listModuleAnnouncementPresets() {
  return Object.values(moduleAnnouncements).map(({ slug, title, url }) => ({ slug, title, url }));
}
