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

    test('should not include sibling directories as static assets for root-level examples', () => {
      const resolver = new ExampleResolver('tests/fixtures/examples');
      const examples = resolver.discoverAll();
      const baseExample = examples.find(e => e.relativePath === 'base-example.md');

      // base-example.md is at root level, so it should have NO static assets
      // (sibling directories like beam/ and marpx/ should NOT be included)
      expect(baseExample?.staticAssets).toEqual([]);
    });

    test('should include static assets from same directory as example', () => {
      const resolver = new ExampleResolver('tests/fixtures/examples');
      const examples = resolver.discoverAll();
      const beamExample = examples.find(e => e.relativePath.includes('beam'));

      // beam-example.md is at beam/beam-example.md
      // static asset is at beam/static/beam-logo.png
      // relative path from examplesDir is beam/static/beam-logo.png
      expect(beamExample?.staticAssets).toContain('beam/static/beam-logo.png');
    });
  });

  describe('ExampleResolver.filterBySelectedThemes', () => {
    let allExamples;

    beforeEach(() => {
      const resolver = new ExampleResolver('tests/fixtures/examples');
      allExamples = resolver.discoverAll();
    });

    test('should include base examples always', () => {
      const resolver = new ExampleResolver();
      const filtered = resolver.filterBySelectedThemes(allExamples, []);
      const baseExample = filtered.find(e => e.relativePath === 'base-example.md');
      expect(baseExample).toBeDefined();
    });

    test('should filter by partial match of themes', () => {
      const resolver = new ExampleResolver();
      const filtered = resolver.filterBySelectedThemes(allExamples, ['beam']);
      expect(filtered.some(e => e.themes.includes('beam'))).toBe(true);
      // Note: marpx-example has themes [marpx, beam], so it will be included
      // when filtering by beam due to partial match
      const marpxExample = filtered.find(e => e.relativePath.includes('marpx'));
      expect(marpxExample.themes.includes('beam')).toBe(true);
    });

    test('should include example if any theme matches', () => {
      const resolver = new ExampleResolver();
      // marpx-example.md has themes: [marpx, beam]
      const filtered = resolver.filterBySelectedThemes(allExamples, ['beam']);
      const marpxExample = filtered.find(e => e.relativePath.includes('marpx'));
      expect(marpxExample).toBeDefined(); // Should be included due to partial match
    });

    test('should return empty array if no base examples and no theme match', () => {
      const resolver = new ExampleResolver();
      const noBaseExamples = allExamples.filter(e => !e.isBase);
      const filtered = resolver.filterBySelectedThemes(noBaseExamples, ['non-existent']);
      expect(filtered).toEqual([]);
    });

    test('should include all examples when themes array is empty (base examples only)', () => {
      const resolver = new ExampleResolver();
      const filtered = resolver.filterBySelectedThemes(allExamples, []);
      expect(filtered.every(e => e.isBase)).toBe(true);
    });
  });
});
