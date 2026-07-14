/**
 * Armazenamento de arquivos em disco (v1 — débito técnico registrado em
 * "09 - Módulos/Recrutamento e Seleção/02 - Onde Pecamos (1.0) e Correções.md" item 8:
 * migrar para storage de objetos quando o volume justificar).
 * Nome de arquivo aleatório + extensão validada (padrão de segurança herdado do 1.0).
 * Genérico por subpasta — currículos e anexos de admissão reusam o mesmo mecanismo.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EXTENSAO_POR_TIPO_CURRICULO: Record<string, string> = { pdf: '.pdf', docx: '.docx', txt: '.txt' };

export function diretorioUploads(): string {
  return path.resolve(process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), 'uploads'));
}

export async function salvarArquivo(
  subpasta: string,
  codTen: bigint,
  extensao: string,
  buffer: Buffer,
): Promise<string> {
  const pasta = path.join(diretorioUploads(), subpasta, codTen.toString());
  await mkdir(pasta, { recursive: true });
  const nomeArquivo = `${Date.now()}-${randomBytes(8).toString('hex')}${extensao}`;
  await writeFile(path.join(pasta, nomeArquivo), buffer);
  return path.join(subpasta, codTen.toString(), nomeArquivo);
}

export async function salvarCurriculo(
  codTen: bigint,
  tipoArquivo: string,
  buffer: Buffer,
): Promise<string> {
  return salvarArquivo('curriculos', codTen, EXTENSAO_POR_TIPO_CURRICULO[tipoArquivo] ?? '', buffer);
}
