const fs = require('fs');
const path = require('path');
const { globSync } = require('fast-glob');

// Читаем конфиг с дефолтными значениями
let config;
try {
  config = require('../marp.config.js');
} catch {
  config = {};
}

const outputDir = config.outputDir || 'output';
const staticFolders = config.staticFolders || ['static/**'];

// Создаём output если нет
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Находим файлы по паттернам
const files = globSync(staticFolders);

if (files.length === 0) {
  console.log('No static files found to copy.');
  process.exit(0);
}

// Копируем с сохранением структуры
let copied = 0;
for (const file of files) {
  const relativePath = path.relative(process.cwd(), file);
  const destPath = path.join(outputDir, relativePath);

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    fs.copyFileSync(file, destPath);
    copied++;
  } catch (err) {
    console.warn(`Warning: Could not copy ${file}: ${err.message}`);
  }
}

console.log(`✓ Copied ${copied} file(s) to ${outputDir}/`);
