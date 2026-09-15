import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';

const PAGES_DIR = new URL('../frontend/pages/', import.meta.url);
const PARTIALS_DIR = new URL('../frontend/partials/', import.meta.url);
const OUT_DIR = new URL('../public/', import.meta.url);

const PARTIAL_NAMES = ['header', 'navigation', 'footer'];

async function buildOnce() {
  await mkdir(OUT_DIR, { recursive: true });

  const partials = new Map();
  for (const name of PARTIAL_NAMES) {
    const content = await readFile(new URL(`${name}.html`, PARTIALS_DIR), 'utf8');
    partials.set(name.toUpperCase(), content.trim());
  }

  const pageFiles = (await readdir(PAGES_DIR)).filter((file) => file.endsWith('.html'));
  for (const file of pageFiles) {
    let html = await readFile(new URL(file, PAGES_DIR), 'utf8');
    for (const [token, content] of partials) {
      html = html.split(`{{${token}}}`).join(content);
    }
    await writeFile(new URL(file, OUT_DIR), html, 'utf8');
  }
  process.stdout.write(`built public/ from ${pageFiles.length} page(s)\n`);
}

const { argv } = process;
if (argv.includes('--watch')) {
  void buildOnce().then(() => {
    let timer;
    watch(new URL('../frontend/', import.meta.url), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void buildOnce().catch((error) => console.error(error));
      }, 100);
    });
    process.stdout.write('watching frontend/ for html changes\n');
  });
} else {
  buildOnce().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}