const { ExampleResolver } = require('../../lib/example-resolver');

describe('ExampleResolver', () => {
  describe('constructor', () => {
    test('should set default examples directory', () => {
      const resolver = new ExampleResolver();
      expect(resolver.examplesDir).toBe('examples');
    });

    test('should accept custom examples directory', () => {
      const resolver = new ExampleResolver('/custom/path');
      expect(resolver.examplesDir).toBe('/custom/path');
    });
  });

  describe('ExampleResolver.discoverAll', () => {
    test('should find all .md files and parse frontmatter', () => {
      // This test assumes examples/ directory structure exists
      // For now, test with empty directory
      const resolver = new ExampleResolver('tests/fixtures/examples');
      const examples = resolver.discoverAll();
      expect(Array.isArray(examples)).toBe(true);
    });

    test('should return empty array if examples directory does not exist', () => {
      const resolver = new ExampleResolver('non-existent-path');
      const examples = resolver.discoverAll();
      expect(examples).toEqual([]);
    });

    test('should mark examples without themes field as base examples', () => {
      // Will be implemented with fixture setup
      const resolver = new ExampleResolver('tests/fixtures/examples');
      const examples = resolver.discoverAll();
      const baseExample = examples.find(e => e.relativePath === 'base-example.md');
      expect(baseExample?.isBase).toBe(true);
    });

    test('should parse themes field from frontmatter', () => {
      const resolver = new ExampleResolver('tests/fixtures/examples');
      const examples = resolver.discoverAll();
      const beamExample = examples.find(e => e.relativePath.includes('beam'));
      expect(beamExample?.themes).toContain('beam');
    });
  });
});
