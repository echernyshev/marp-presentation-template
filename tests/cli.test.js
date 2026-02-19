const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('CLI Initializer', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    // Очистка тестовых проектов
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('должен создать структуру проекта', () => {
    const projectName = 'test-presentation';
    const projectPath = path.join(projectRoot, projectName);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'marp.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'presentation.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'static'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'scripts', 'copy-static.js'))).toBe(true);
  });

  test('должен отклонить невалидное имя проекта', () => {
    const result = spawnSync('node', ['index.js', 'Invalid_Name'], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Invalid project name');
  });

  test('должен отклонить существующую папку', () => {
    const projectName = 'existing-project';
    const projectPath = path.join(projectRoot, projectName);
    testProjects.push(projectPath);
    fs.mkdirSync(projectPath);

    const result = spawnSync('node', ['index.js', projectName], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('already exists');
  });

  test('должен требовать имя проекта', () => {
    const result = spawnSync('node', ['index.js'], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Please provide a project name');
  });

  test('should reject path traversal attempts', () => {
    const result = spawnSync('node', ['index.js', '../malicious'], {
      cwd: projectRoot,
    });
    expect(result.status).toBe(1);
    // Path traversal is caught by name validation (contains dots/slashes)
    expect(result.stderr.toString()).toMatch(/Invalid project name|path traversal/);
  });
});
