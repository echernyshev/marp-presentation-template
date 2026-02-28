// lib/errors.js
class ThemeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ThemeError';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ThemeNotFoundError extends ThemeError {
  constructor(themeName) {
    super(`Theme '${themeName}' not found`);
    this.name = 'ThemeNotFoundError';
    this.themeName = themeName;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ThemeAlreadyExistsError extends ThemeError {
  constructor(themeName) {
    super(`Theme '${themeName}' already exists`);
    this.name = 'ThemeAlreadyExistsError';
    this.themeName = themeName;
    Error.captureStackTrace(this, this.constructor);
  }
}

class PresentationNotFoundError extends ThemeError {
  constructor(presentationPath) {
    super(`Presentation file not found: ${presentationPath}`);
    this.name = 'PresentationNotFoundError';
    this.presentationPath = presentationPath;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InvalidCSSError extends ThemeError {
  constructor(cssPath, reason) {
    super(`Invalid CSS file '${cssPath}': ${reason}`);
    this.name = 'InvalidCSSError';
    this.cssPath = cssPath;
    this.reason = reason;
    Error.captureStackTrace(this, this.constructor);
  }
}

class VSCodeIntegrationError extends ThemeError {
  constructor(message) {
    super(message);
    this.name = 'VSCodeIntegrationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError,
  InvalidCSSError,
  VSCodeIntegrationError
};
