#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

console.log(`Creating Marp presentation: ${projectName}`);
console.log();

try {
  // Создаём папку проекта
  fs.mkdirSync(projectPath, { recursive: true });

  // Рекурсивно копируем template
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

  copyDir(templatePath, projectPath);

  console.log('✓ Project created');
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
  console.log('  npm run dev     # Start live preview');
  console.log('  npm run build:all  # Build all formats');
  console.log();

} catch (err) {
  console.error('Error creating project:', err.message);
  process.exit(1);
}
