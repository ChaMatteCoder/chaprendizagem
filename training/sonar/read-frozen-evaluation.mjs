import { readFile } from 'node:fs/promises';
import { hashBytes, officialDirectory, readJson, readOptional, requireSameConfig } from './experiment-io.mjs';

/** The versioned completion record remains authoritative without local run files. */
export async function readFrozenEvaluation(context, directory = officialDirectory) {
  const bytes = await readOptional(new URL('manifest.json', directory));
  if (!bytes) return null;
  const manifest = JSON.parse(bytes);
  requireSameConfig(manifest, context);
  if (manifest.kind !== 'official' || manifest.evaluation?.status !== 'completed' ||
      manifest.datasetSha256 !== context.config.datasetSha256 ||
      manifest.partitionsSha256 !== context.config.partitionsSha256 ||
      !manifest.files?.['evaluation.json'] || !manifest.files?.['weights.bin']) {
    throw new Error('Registro oficial incompatível ou incompleto; avaliação não será repetida.');
  }
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!/^[a-z-]+\.(json|bin)$/.test(file)) throw new Error('Caminho de artefato oficial inválido.');
    const artifact = await readFile(new URL(file, directory));
    if (artifact.length !== expected.byteLength || hashBytes(artifact) !== expected.sha256) {
      throw new Error(`Artefato oficial divergente: ${file}; avaliação não será repetida.`);
    }
  }
  const evaluation = await readJson(new URL('evaluation.json', directory));
  requireSameConfig(evaluation, context);
  if (evaluation.status !== 'completed' || evaluation.modelId !== manifest.modelId ||
      evaluation.weightsSha256 !== manifest.files['weights.bin'].sha256 ||
      evaluation.result?.metrics?.total !== context.partitions.testIds.length) {
    throw new Error('Conclusão oficial não corresponde ao modelo e teste reservados.');
  }
  return manifest;
}
