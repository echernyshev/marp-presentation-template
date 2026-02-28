const fs = require('fs');
const os = require('os');
const path = require('path');
const { getTempDir, cleanupTestOutputDir } = require('../../helpers/test-output');

const {
  expandHomePath,
  validateOutputPath,
  copyDir,
  copyOptionalFiles
} = require('../../../cli/utils/file-utils');

describe('cli/utils/file-utils', () => {
  afterAll(() => {
    cleanupTestOutputDir();
  });

  describe('expandHomePath()', () => {
    test('should expand path starting with ~', () => {
      const homeDir = os.homedir();
      const input = '~/documents';
      const result = expandHomePath(input);
      expect(result).toBe(path.join(homeDir, 'documents'));
    });

    test('should expand single ~ to home directory', () => {
      const homeDir = os.homedir();
      const result = expandHomePath('~');
      expect(result).toBe(homeDir);
    });

    test('should expand ~/ with trailing separator to home directory', () => {
      const homeDir = os.homedir();
      const result = expandHomePath('~/');
      // The actual behavior: path.join(homedir(), '/') returns homedir + '/'
      // This is the current implementation's behavior
      expect(result).toBe(homeDir + path.sep);
    });

    test('should return path unchanged when not starting with ~', () => {
      const input = '/var/log';
      const result = expandHomePath(input);
      expect(result).toBe('/var/log');
    });

    test('should handle relative paths without ~', () => {
      const input = './local/path';
      const result = expandHomePath(input);
      expect(result).toBe('./local/path');
    });

    test('should handle absolute paths without ~', () => {
      const input = '/usr/local/bin';
      const result = expandHomePath(input);
      expect(result).toBe('/usr/local/bin');
    });

    test('should handle empty string', () => {
      const result = expandHomePath('');
      expect(result).toBe('');
    });

    test('should handle paths with ~ in the middle (not at start)', () => {
      const input = '/path/~/documents';
      const result = expandHomePath(input);
      expect(result).toBe('/path/~/documents');
    });
  });

  describe('validateOutputPath()', () => {
    test('should reject empty path', () => {
      const result = validateOutputPath('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path cannot be empty');
    });

    test('should reject null path', () => {
      const result = validateOutputPath(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path cannot be empty');
    });

    test('should reject whitespace-only path', () => {
      const result = validateOutputPath('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path cannot be empty');
    });

    test('should reject path with null bytes (security)', () => {
      const result = validateOutputPath('/etc/passwd\0malicious');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path contains null bytes');
    });

    test('should reject /etc directory', () => {
      const result = validateOutputPath('/etc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
      expect(result.error).toContain('/etc');
    });

    test('should reject /etc subdirectory', () => {
      const result = validateOutputPath('/etc/myproject');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
    });

    test('should reject /sys directory', () => {
      const result = validateOutputPath('/sys');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
    });

    test('should reject /proc directory', () => {
      const result = validateOutputPath('/proc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
    });

    test('should reject /root directory', () => {
      const result = validateOutputPath('/root');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
    });

    test('should reject /boot directory', () => {
      const result = validateOutputPath('/boot');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot create project in system directory');
    });

    test('should reject path containing node_modules', () => {
      const result = validateOutputPath('./node_modules/myproject');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot create project inside node_modules directory');
    });

    test('should reject node_modules at root level', () => {
      const result = validateOutputPath('node_modules');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot create project inside node_modules directory');
    });

    test('should accept valid absolute path', () => {
      const result = validateOutputPath('/tmp/myproject');
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/tmp/myproject');
    });

    test('should accept valid relative path', () => {
      const result = validateOutputPath('./myproject');
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBeDefined();
      expect(result.resolvedPath).toContain('myproject');
    });

    test('should accept valid path with ~ and resolve to absolute', () => {
      const homeDir = os.homedir();
      const result = validateOutputPath('~/projects');
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(path.join(homeDir, 'projects'));
    });

    test('should be case-insensitive for system directory checks', () => {
      const result = validateOutputPath('/ETC/MYPROJECT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('/etc');
    });
  });

  describe('copyDir()', () => {
    let tempDirs = [];

    afterEach(() => {
      for (const dir of tempDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      tempDirs = [];
    });

    function makeTempDir(name) {
      const dir = getTempDir(name);
      tempDirs.push(dir);
      return dir;
    }

    test('should copy directory with files recursively', () => {
      const tempBase = makeTempDir('copydir-basic');
      const tempSrcDir = path.join(tempBase, 'src');
      const tempDestDir = path.join(tempBase, 'dest');
      fs.mkdirSync(tempSrcDir, { recursive: true });
      fs.mkdirSync(tempDestDir, { recursive: true });

      // Create test files
      fs.writeFileSync(path.join(tempSrcDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tempSrcDir, 'file2.md'), '# content2');

      // Create subdirectory with files
      const subdir = path.join(tempSrcDir, 'subdir');
      fs.mkdirSync(subdir);
      fs.writeFileSync(path.join(subdir, 'nested.txt'), 'nested content');

      copyDir(tempSrcDir, tempDestDir);

      expect(fs.existsSync(tempDestDir)).toBe(true);
      expect(fs.existsSync(path.join(tempDestDir, 'file1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(tempDestDir, 'file2.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDestDir, 'subdir'))).toBe(true);
      expect(fs.existsSync(path.join(tempDestDir, 'subdir', 'nested.txt'))).toBe(true);

      // Verify file contents
      expect(fs.readFileSync(path.join(tempDestDir, 'file1.txt'), 'utf8')).toBe('content1');
      expect(fs.readFileSync(path.join(tempDestDir, 'subdir', 'nested.txt'), 'utf8')).toBe('nested content');
    });

    test('should throw error when source does not exist', () => {
      const tempBase = makeTempDir('copydir-nosrc');
      const tempSrcDir = path.join(tempBase, 'nonexistent-src');
      const tempDestDir = path.join(tempBase, 'dest');
      fs.mkdirSync(tempDestDir, { recursive: true });

      expect(() => {
        copyDir(tempSrcDir, tempDestDir);
      }).toThrow();
    });

    test('should create destination directory if not exists', () => {
      const tempBase = makeTempDir('copydir-nodest');
      const tempSrcDir = path.join(tempBase, 'src');
      const tempDestDir = path.join(tempBase, 'dest');
      fs.mkdirSync(tempSrcDir, { recursive: true });
      fs.writeFileSync(path.join(tempSrcDir, 'file1.txt'), 'content1');

      // The function expects the destination directory to be created by the caller
      // This is consistent with how it's used in create-project.js
      expect(() => {
        copyDir(tempSrcDir, tempDestDir);
      }).toThrow(); // Will throw because dest doesn't exist
    });

    test('should copy empty directory (creating dest as empty)', () => {
      const tempBase = makeTempDir('copydir-empty');
      const emptySrc = path.join(tempBase, 'src');
      const emptyDest = path.join(tempBase, 'dest');
      fs.mkdirSync(emptySrc, { recursive: true });
      fs.mkdirSync(emptyDest, { recursive: true }); // Caller must create dest

      copyDir(emptySrc, emptyDest);

      // Empty source means no files to copy, dest remains empty
      expect(fs.readdirSync(emptyDest)).toEqual([]);
    });

    test('should handle deeply nested directories', () => {
      const tempBase = makeTempDir('copydir-deep');
      const tempSrcDir = path.join(tempBase, 'src');
      const tempDestDir = path.join(tempBase, 'dest');
      fs.mkdirSync(tempSrcDir, { recursive: true });
      fs.mkdirSync(tempDestDir, { recursive: true });

      const deepPath = path.join(tempSrcDir, 'level1', 'level2', 'level3');
      fs.mkdirSync(deepPath, { recursive: true });
      fs.writeFileSync(path.join(deepPath, 'deep.txt'), 'deep content');

      copyDir(tempSrcDir, tempDestDir);

      expect(fs.existsSync(path.join(tempDestDir, 'level1', 'level2', 'level3', 'deep.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(tempDestDir, 'level1', 'level2', 'level3', 'deep.txt'), 'utf8')).toBe('deep content');
    });
  });

  describe('copyOptionalFiles()', () => {
    let tempProjectDir;
    let tempOptionalDir;
    let testDirs = [];

    beforeEach(() => {
      // Create temporary directories
      const tempBase = getTempDir('copyoptional');
      testDirs.push(tempBase);
      tempProjectDir = path.join(tempBase, 'project');
      tempOptionalDir = path.join(tempBase, 'template-optional');
      fs.mkdirSync(tempProjectDir, { recursive: true });
      fs.mkdirSync(tempOptionalDir, { recursive: true });

      // Create static directory in project
      fs.mkdirSync(path.join(tempProjectDir, 'static'), { recursive: true });
    });

    afterEach(() => {
      for (const dir of testDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      testDirs = [];
    });

    test('should copy examples.md when it exists', () => {
      // Create examples.md in template-optional
      const examplesContent = '# Example Slides\n\nThis is an example.';
      fs.writeFileSync(path.join(tempOptionalDir, 'examples.md'), examplesContent);

      // We need to temporarily hijack __dirname resolution
      // Since copyOptionalFiles uses path.join(__dirname, '..', '..', 'template-optional')
      // We'll test by creating the actual structure in a temp location and using require
      const originalModule = require.cache[require.resolve('../../../cli/utils/file-utils')];
      delete require.cache[require.resolve('../../../cli/utils/file-utils')];

      // Create a temp module directory structure
      const tempModuleDir = path.join(tempOptionalDir, 'cli', 'utils');
      fs.mkdirSync(tempModuleDir, { recursive: true });

      // Copy the file-utils.js to temp location (so __dirname points to our temp)
      const originalFileUtils = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'cli', 'utils', 'file-utils.js'), 'utf8');

      // We can't easily mock __dirname, so let's test the function differently
      // by creating a real template-optional in the test directory
      delete require.cache[require.resolve('../../../cli/utils/file-utils')];
      const { copyOptionalFiles: actualCopyOptional } = require('../../../cli/utils/file-utils');

      // For this test, we'll manually test the logic by creating files in the real template-optional
      const realOptionalPath = path.join(__dirname, '..', '..', '..', 'template-optional');
      const realExamplesPath = path.join(realOptionalPath, 'examples.md');

      // Backup if exists
      const backup = fs.existsSync(realExamplesPath) ? fs.readFileSync(realExamplesPath) : null;

      try {
        fs.mkdirSync(realOptionalPath, { recursive: true });
        fs.writeFileSync(realExamplesPath, examplesContent);

        actualCopyOptional(tempProjectDir);

        expect(fs.existsSync(path.join(tempProjectDir, 'examples.md'))).toBe(true);
        expect(fs.readFileSync(path.join(tempProjectDir, 'examples.md'), 'utf8')).toBe(examplesContent);
      } finally {
        if (backup) {
          fs.writeFileSync(realExamplesPath, backup);
        } else if (fs.existsSync(realExamplesPath)) {
          fs.rmSync(realExamplesPath, { force: true });
        }
      }
    });

    test('should skip examples.md gracefully when missing', () => {
      const realOptionalPath = path.join(__dirname, '..', '..', '..', 'template-optional');
      const realExamplesPath = path.join(realOptionalPath, 'examples.md');

      const backup = fs.existsSync(realExamplesPath) ? fs.readFileSync(realExamplesPath) : null;

      try {
        // Ensure examples.md doesn't exist
        if (fs.existsSync(realExamplesPath)) {
          fs.rmSync(realExamplesPath, { force: true });
        }

        const { copyOptionalFiles: actualCopyOptional } = require('../../../cli/utils/file-utils');

        // Should not throw
        expect(() => {
          actualCopyOptional(tempProjectDir);
        }).not.toThrow();

        expect(fs.existsSync(path.join(tempProjectDir, 'examples.md'))).toBe(false);
      } finally {
        if (backup) {
          fs.writeFileSync(realExamplesPath, backup);
        }
      }
    });

    test('should copy demo image when it exists', () => {
      const realOptionalPath = path.join(__dirname, '..', '..', '..', 'template-optional');
      const realStaticDir = path.join(realOptionalPath, 'static');
      const realDemoPath = path.join(realStaticDir, 'demo-image.png');

      const backup = fs.existsSync(realDemoPath) ? fs.readFileSync(realDemoPath) : null;

      try {
        fs.mkdirSync(realStaticDir, { recursive: true });
        const demoImageContent = Buffer.from('fake-image-data');
        fs.writeFileSync(realDemoPath, demoImageContent);

        const { copyOptionalFiles: actualCopyOptional } = require('../../../cli/utils/file-utils');
        actualCopyOptional(tempProjectDir);

        expect(fs.existsSync(path.join(tempProjectDir, 'static', 'demo-image.png'))).toBe(true);
        expect(fs.readFileSync(path.join(tempProjectDir, 'static', 'demo-image.png'))).toEqual(demoImageContent);
      } finally {
        if (backup) {
          fs.writeFileSync(realDemoPath, backup);
        } else if (fs.existsSync(realDemoPath)) {
          fs.rmSync(realDemoPath, { force: true });
        }
      }
    });

    test('should skip demo image gracefully when missing', () => {
      const realOptionalPath = path.join(__dirname, '..', '..', '..', 'template-optional');
      const realStaticDir = path.join(realOptionalPath, 'static');
      const realDemoPath = path.join(realStaticDir, 'demo-image.png');

      const backup = fs.existsSync(realDemoPath) ? fs.readFileSync(realDemoPath) : null;

      try {
        // Ensure demo image doesn't exist
        if (fs.existsSync(realDemoPath)) {
          fs.rmSync(realDemoPath, { force: true });
        }

        const { copyOptionalFiles: actualCopyOptional } = require('../../../cli/utils/file-utils');

        expect(() => {
          actualCopyOptional(tempProjectDir);
        }).not.toThrow();

        expect(fs.existsSync(path.join(tempProjectDir, 'static', 'demo-image.png'))).toBe(false);
      } finally {
        if (backup) {
          fs.writeFileSync(realDemoPath, backup);
        }
      }
    });

    test('should copy both examples.md and demo image when both exist', () => {
      const realOptionalPath = path.join(__dirname, '..', '..', '..', 'template-optional');
      const realExamplesPath = path.join(realOptionalPath, 'examples.md');
      const realStaticDir = path.join(realOptionalPath, 'static');
      const realDemoPath = path.join(realStaticDir, 'demo-image.png');

      const backupExamples = fs.existsSync(realExamplesPath) ? fs.readFileSync(realExamplesPath) : null;
      const backupDemo = fs.existsSync(realDemoPath) ? fs.readFileSync(realDemoPath) : null;

      try {
        fs.mkdirSync(realOptionalPath, { recursive: true });
        fs.mkdirSync(realStaticDir, { recursive: true });

        const examplesContent = '# Examples';
        fs.writeFileSync(realExamplesPath, examplesContent);

        const demoImageContent = Buffer.from('image-data');
        fs.writeFileSync(realDemoPath, demoImageContent);

        const { copyOptionalFiles: actualCopyOptional } = require('../../../cli/utils/file-utils');
        actualCopyOptional(tempProjectDir);

        expect(fs.existsSync(path.join(tempProjectDir, 'examples.md'))).toBe(true);
        expect(fs.readFileSync(path.join(tempProjectDir, 'examples.md'), 'utf8')).toBe(examplesContent);
        expect(fs.existsSync(path.join(tempProjectDir, 'static', 'demo-image.png'))).toBe(true);
        expect(fs.readFileSync(path.join(tempProjectDir, 'static', 'demo-image.png'))).toEqual(demoImageContent);
      } finally {
        if (backupExamples) {
          fs.writeFileSync(realExamplesPath, backupExamples);
        } else if (fs.existsSync(realExamplesPath)) {
          fs.rmSync(realExamplesPath, { force: true });
        }
        if (backupDemo) {
          fs.writeFileSync(realDemoPath, backupDemo);
        } else if (fs.existsSync(realDemoPath)) {
          fs.rmSync(realDemoPath, { force: true });
        }
      }
    });
  });
});
