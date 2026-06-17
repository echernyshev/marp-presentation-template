const fs = require('fs');
const path = require('path');
const { globSync } = require('fast-glob');

// Читаем конфиг с дефолтными значениями (относительно расположения скрипта)
function loadConfig() {
  try {
    return require('../marp.config.js');
  } catch {
    return {};
  }
}

/**
 * Copy static files matched by glob patterns into the output directory.
 *
 * @param {Object} [options]
 * @param {string} [options.cwd=process.cwd()] - Working directory to glob in.
 * @param {Object} [options.config] - Injected config; defaults to loadConfig().
 * @returns {number} Number of files copied (0 if none matched).
 */
function copyStatic(options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = options.config !== undefined ? options.config : loadConfig();

  const outputDir = config.outputDir || 'output';
  const staticFolders = config.staticFolders || ['static/**'];

  const outputPath = path.isAbsolute(outputDir) ? outputDir : path.join(cwd, outputDir);

  // Создаём output если нет
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Находим файлы по паттернам
  const files = globSync(staticFolders, { cwd });

  if (files.length === 0) {
    console.log('No static files found to copy.');
    return 0;
  }

  // Копируем с сохранением структуры
  let copied = 0;
  for (const file of files) {
    const srcPath = path.isAbsolute(file) ? file : path.join(cwd, file);
    const destPath = path.join(outputPath, file);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    } catch (err) {
      console.warn(`Warning: Could not copy ${file}: ${err.message}`);
    }
  }

  console.log(`✓ Copied ${copied} file(s) to ${outputDir}/`);
  return copied;
}

module.exports = { copyStatic, loadConfig };

// Run as a script (scaffolded project: `npm run copy:static`)
if (require.main === module) {
  copyStatic();
}
