const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');

// URLs DE HOSPEDAGEM
const BASE_URL = 'https://raw.githubusercontent.com/LucasPaixaoCL/Drakoria-updates/main/';
// O link de download do Release que criaremos
const RELEASE_URL = 'https://github.com/LucasPaixaoCL/Drakoria-updates/releases/download/assets/';

// Padrões de arquivos e pastas para IGNORAR (não sincronizar)
const IGNORE_PATTERNS = [
  '.git', 
  '.github', 
  'generate-manifest.js', 
  'manifest-standard.json', 
  'manifest-low.json', 
  'node_modules', 
  'package.json', 
  'package-lock.json',
  '.puzzle_cache', 
  'journeymap/cache', 
  'logs', 
  'backups',
  '.DS_Store',
  'Thumbs.db'
];

// Arquivos Gigantes Mapeados Manualmente
const LARGE_FILES = [
  {
    name: "physics-mod-pro-v171l-fabric-1.20.1.jar",
    path: "mods/physics-mod-pro-v171l-fabric-1.20.1.jar",
    url: RELEASE_URL + "physics-mod-pro-v171l-fabric-1.20.1.jar"
  },
  {
    name: "loadingbackgrounds-medieval 6.0.zip",
    path: "resourcepacks/loadingbackgrounds-medieval 6.0.zip",
    url: RELEASE_URL + "loadingbackgrounds-medieval%206.0.zip"
  }
];

async function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function generate(preset) {
  const root = process.cwd();
  const allFiles = await getFiles(root);
  const manifest = { version: Date.now().toString(), files: [] };

  console.log(`🔍 Escaneando arquivos para o preset [${preset}]...`);

  // 1. Arquivos normais via GitHub Pages
  for (const fullPath of allFiles) {
    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
    
    // Ignora baseado nos padrões definidos
    if (IGNORE_PATTERNS.some(pattern => relativePath.includes(pattern))) continue;

    // Alerta se houver caracteres estranhos que podem quebrar o download
    if (path.basename(relativePath).includes('%')) {
        console.warn(`⚠️ Alerta: O arquivo "${relativePath}" contém o caractere '%'. Isso pode causar erros de download.`);
    }

    const content = await fs.readFile(fullPath);
    const hash = crypto.createHash('sha1').update(content).digest('hex');

    manifest.files.push({
      name: path.basename(relativePath),
      path: relativePath,
      hash: hash,
      // Usamos encodeURI para garantir que espaços virem %20 nas URLs
      url: BASE_URL + encodeURI(relativePath)
    });
  }

  // 2. Arquivos Gigantes via GitHub Releases
  for (const lf of LARGE_FILES) {
    const lfPath = path.join('../Large-Assets', lf.name);
    if (fs.existsSync(lfPath)) {
      const content = await fs.readFile(lfPath);
      const hash = crypto.createHash('sha1').update(content).digest('hex');
      manifest.files.push({
        name: lf.name,
        path: lf.path,
        hash: hash,
        url: lf.url
      });
    } else {
      console.warn(`⚠️ Arquivo gigante não encontrado em ${lfPath}.`);
    }
  }

  const fileName = `manifest-${preset}.json`;
  await fs.writeJson(fileName, manifest, { spaces: 2 });
  console.log(`✅ Manifesto Híbrido [${preset}] gerado com ${manifest.files.length} arquivos!`);
}

async function run() {
  console.log('🚀 Iniciando geração de manifestos otimizada...');
  await generate('standard');
  await generate('low');
  console.log('✨ Processo concluído com sucesso.');
}

run().catch(console.error);
