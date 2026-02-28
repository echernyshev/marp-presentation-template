// tests/unit/errors.test.js
const {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError,
  InvalidCSSError,
  VSCodeIntegrationError
} = require('../../lib/errors');

describe('ThemeError classes', () => {
  test('ThemeError should be instance of Error', () => {
    const error = new ThemeError('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('test message');
    expect(error.name).toBe('ThemeError');
  });

  test('ThemeNotFoundError should have correct name', () => {
    const error = new ThemeNotFoundError('my-theme');
    expect(error.name).toBe('ThemeNotFoundError');
    expect(error.message).toContain('my-theme');
  });

  test('ThemeNotFoundError should be instance of ThemeError', () => {
    const error = new ThemeNotFoundError('my-theme');
    expect(error).toBeInstanceOf(ThemeError);
  });

  test('ThemeNotFoundError should expose themeName property', () => {
    const error = new ThemeNotFoundError('my-theme');
    expect(error.themeName).toBe('my-theme');
  });

  test('ThemeAlreadyExistsError should have correct name', () => {
    const error = new ThemeAlreadyExistsError('my-theme');
    expect(error.name).toBe('ThemeAlreadyExistsError');
    expect(error.message).toContain('my-theme');
  });

  test('ThemeAlreadyExistsError should be instance of ThemeError', () => {
    const error = new ThemeAlreadyExistsError('my-theme');
    expect(error).toBeInstanceOf(ThemeError);
  });

  test('ThemeAlreadyExistsError should expose themeName property', () => {
    const error = new ThemeAlreadyExistsError('my-theme');
    expect(error.themeName).toBe('my-theme');
  });

  test('PresentationNotFoundError should have correct name', () => {
    const error = new PresentationNotFoundError('/path/to/presentation.md');
    expect(error.name).toBe('PresentationNotFoundError');
    expect(error.message).toContain('/path/to/presentation.md');
  });

  test('PresentationNotFoundError should be instance of ThemeError', () => {
    const error = new PresentationNotFoundError('/path/to/presentation.md');
    expect(error).toBeInstanceOf(ThemeError);
  });

  test('PresentationNotFoundError should expose presentationPath property', () => {
    const error = new PresentationNotFoundError('/path/to/presentation.md');
    expect(error.presentationPath).toBe('/path/to/presentation.md');
  });

  test('InvalidCSSError should have correct name', () => {
    const error = new InvalidCSSError('/path/to/theme.css', 'syntax error');
    expect(error.name).toBe('InvalidCSSError');
    expect(error.message).toContain('/path/to/theme.css');
  });

  test('InvalidCSSError should be instance of ThemeError', () => {
    const error = new InvalidCSSError('/path/to/theme.css', 'syntax error');
    expect(error).toBeInstanceOf(ThemeError);
  });

  test('InvalidCSSError should expose cssPath and reason properties', () => {
    const error = new InvalidCSSError('/path/to/theme.css', 'syntax error');
    expect(error.cssPath).toBe('/path/to/theme.css');
    expect(error.reason).toBe('syntax error');
  });

  test('VSCodeIntegrationError should have correct name', () => {
    const error = new VSCodeIntegrationError('Failed to update settings');
    expect(error.name).toBe('VSCodeIntegrationError');
    expect(error.message).toBe('Failed to update settings');
  });

  test('VSCodeIntegrationError should be instance of ThemeError', () => {
    const error = new VSCodeIntegrationError('Failed to update settings');
    expect(error).toBeInstanceOf(ThemeError);
  });
});
