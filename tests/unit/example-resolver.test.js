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
});
