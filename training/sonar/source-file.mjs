import { createHash } from 'node:crypto';

export function verifySonarSource(bytes, source) {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== source.sha256 || bytes.byteLength !== source.byteLength) {
    throw new Error(`Fonte Sonar diverge do lock: ${bytes.byteLength} bytes, SHA-256 ${sha256}. Nenhum artefato deve ser gerado.`);
  }
  return sha256;
}

export async function downloadSonarSource(source, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(source.downloadUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Falha ao obter Sonar da UCI: HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifySonarSource(bytes, source);
  return bytes;
}
