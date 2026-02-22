#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');

const projectName = process.argv[2];

if (!projectName) {
  console.error('Please provide a project name:');
  console.error('  npx create-marp-presentation <project-name>');
  process.exit(1);
}

// Валидация имени проекта
const validName = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
if (!validName.test(projectName)) {
  console.error(`Invalid project name: "${projectName}"`);
  console.error('Project name must be lowercase, contain only letters, numbers, and hyphens.');
  process.exit(1);
}

const projectPath = path.join(process.cwd(), projectName);

// Запрос на создание примеров слайдов
async function askCreateExamples() {
  return new Promise((resolve) => {
    // Интерактивный режим — спрашиваем пользователя
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Create example slides file? (Y/n) ', (answer) => {
        rl.close();
        const normalized = answer.toLowerCase().trim();
        resolve(normalized !== 'n' && normalized !== 'no');
      });
    } else {
      // Неинтерактивный режим — читаем из stdin если есть данные
      let input = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('readable', () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
          input += chunk;
        }
      });

      process.stdin.on('end', () => {
        const normalized = input.toLowerCase().trim();
        // Если ввод пустой, создаём примеры по умолчанию
        if (normalized === '') {
          resolve(true);
        } else {
          resolve(normalized !== 'n' && normalized !== 'no');
        }
      });

      // Если stdin не имеет данных сразу, завершаем
      if (process.stdin.readableLength === 0) {
        // Даем небольшое время на появление данных
        setTimeout(() => {
          if (input === '') {
            process.stdin.destroy();
            resolve(true);
          }
        }, 10);
      }
    }
  });
}

// Validate path to prevent traversal attacks
const resolvedPath = path.resolve(projectPath);
if (!resolvedPath.startsWith(path.resolve(process.cwd()))) {
  console.error('Invalid project path: path traversal detected.');
  process.exit(1);
}

// Проверка существования папки
if (fs.existsSync(projectPath)) {
  console.error(`Directory "${projectName}" already exists.`);
  process.exit(1);
}

// Получаем путь к template
const templatePath = path.join(__dirname, 'template');

// Рекурсивное копирование директории
const copyDir = (src, dest) => {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Копирование опциональных файлов
const copyOptionalFiles = (destPath) => {
  const optionalPath = path.join(__dirname, 'template-optional');

  // Копируем examples.md
  const examplesSrc = path.join(optionalPath, 'examples.md');
  const examplesDest = path.join(destPath, 'examples.md');
  if (fs.existsSync(examplesSrc)) {
    fs.copyFileSync(examplesSrc, examplesDest);
  }

  // Копируем демо-изображение
  const demoImageSrc = path.join(optionalPath, 'static', 'demo-image.png');
  const demoImageDest = path.join(destPath, 'static', 'demo-image.png');
  if (fs.existsSync(demoImageSrc)) {
    fs.copyFileSync(demoImageSrc, demoImageDest);
  }
};

console.log(`Creating Marp presentation: ${projectName}`);
console.log();

// Основной async flow
(async () => {
  try {
    // Запрашиваем создание примеров
    const createExamples = await askCreateExamples();

    // Создаём папку проекта
    fs.mkdirSync(projectPath, { recursive: true });

    // Рекурсивно копируем template
    copyDir(templatePath, projectPath);

    console.log('✓ Project created');

    // Копируем опциональные файлы
    if (createExamples) {
      copyOptionalFiles(projectPath);
      console.log('✓ Example slides added');
      console.log('✓ Demo image added to static/');
    }
    console.log();

    // Запускаем npm install
    console.log('Installing dependencies...');
    const installResult = spawnSync('npm', ['install'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    if (installResult.status !== 0) {
      console.error();
      console.error('Failed to install dependencies.');
      console.error('Please run "cd ' + projectName + ' && npm install" manually.');
      process.exit(1);
    }

    console.log();
    console.log('✓ Dependencies installed');
    console.log();
    console.log('Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  npm run dev        # Start live preview');
    if (createExamples) {
      console.log('  marp examples.md   # Preview example slides');
    }
    console.log('  npm run build:all  # Build all formats');
    console.log();

  } catch (err) {
    console.error('Error creating project:', err.message);
    process.exit(1);
  }
})();
