/**
 * Example class representing a discovered example
 */
class Example {
  constructor(data) {
    this.path = data.path;
    this.relativePath = data.relativePath;
    this.themes = data.themes || [];
    this.isBase = data.isBase || false;
    this.staticAssets = data.staticAssets || [];
  }
}

/**
 * Resolver for discovering and filtering presentation examples
 */
class ExampleResolver {
  constructor(examplesDir = 'examples') {
    this.examplesDir = examplesDir;
  }
}

module.exports = { ExampleResolver, Example };
