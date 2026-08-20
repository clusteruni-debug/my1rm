import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'dist');

export const PUBLIC_FILES = Object.freeze([
  '_headers',
  'ads.txt',
  'app.js',
  'favicon.svg',
  'index.html',
  'methodology.html',
  'privacy.html',
  'robots.txt',
  'sitemap.xml',
  'styles.css',
  'terms.html',
]);

export async function buildPublic() {
  const resolvedOutput = path.resolve(outputDir);
  if (path.dirname(resolvedOutput) !== projectRoot || path.basename(resolvedOutput) !== 'dist') {
    throw new Error('Refusing to clean an unexpected output directory.');
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const relativePath of PUBLIC_FILES) {
    const sourcePath = path.join(projectRoot, relativePath);
    const targetPath = path.join(outputDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }

  return { outputDir, files: [...PUBLIC_FILES] };
}

const isDirectRun = process.argv[1] && path.basename(process.argv[1]) === path.basename(fileURLToPath(import.meta.url));
if (isDirectRun) {
  const result = await buildPublic();
  console.log(`Built ${result.files.length} public files in ${path.relative(projectRoot, result.outputDir)}.`);
}
