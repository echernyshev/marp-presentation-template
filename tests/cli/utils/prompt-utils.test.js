// Mock readline at the top level before requiring the module under test
// jest.mock is hoisted, so we need to define the mock inline
const mockQuestion = jest.fn();
const mockClose = jest.fn();

jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: mockQuestion,
    close: mockClose
  }))
}));

const readline = require('readline');

// Now require after mocking is set up
const { askCreateExamples, askAddThemes } = require('../../../cli/utils/prompt-utils');

describe('cli/utils/prompt-utils', () => {
  const originalTTY = process.stdin.isTTY;
  const mockCreateInterface = readline.createInterface;

  beforeEach(() => {
    // Reset mocks before each test
    mockQuestion.mockReset();
    mockClose.mockReset();
    mockCreateInterface.mockClear();
  });

  afterEach(() => {
    // Restore original TTY value
    Object.defineProperty(process.stdin, 'isTTY', { value: originalTTY, writable: true });
  });

  describe('askCreateExamples()', () => {
    test('should return true when user enters "Y" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      // Setup mock to call callback with 'Y'
      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('Y');
      });

      const result = await askCreateExamples();
      expect(result).toBe(true);
      expect(mockQuestion).toHaveBeenCalledWith('Create example slides file? (Y/n) ', expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
    });

    test('should return true when user enters "y" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('y');
      });

      const result = await askCreateExamples();
      expect(result).toBe(true);
    });

    test('should return false when user enters "n" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('n');
      });

      const result = await askCreateExamples();
      expect(result).toBe(false);
    });

    test('should return false when user enters "no" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('no');
      });

      const result = await askCreateExamples();
      expect(result).toBe(false);
    });

    test('should return true when user enters empty string in TTY mode (default)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('');
      });

      const result = await askCreateExamples();
      expect(result).toBe(true);
    });

    test('should handle whitespace input correctly', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('  Yes  ');
      });

      const result = await askCreateExamples();
      expect(result).toBe(true);
    });

    test('should return true in non-TTY mode with empty stdin', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
      Object.defineProperty(process.stdin, 'readableLength', { value: 0, writable: true });

      // Mock stdin methods for non-TTY mode
      const mockOn = jest.fn();
      const mockSetEncoding = jest.fn();
      const mockRead = jest.fn(() => null);
      const mockDestroy = jest.fn();

      Object.defineProperty(process.stdin, 'on', { value: mockOn, writable: true });
      Object.defineProperty(process.stdin, 'setEncoding', { value: mockSetEncoding, writable: true });
      Object.defineProperty(process.stdin, 'read', { value: mockRead, writable: true });
      Object.defineProperty(process.stdin, 'destroy', { value: mockDestroy, writable: true });

      // Mock the 'end' event to trigger immediately
      mockOn.mockImplementation((event, callback) => {
        if (event === 'end' || event === 'readable') {
          setTimeout(() => callback(), 5);
        }
      });

      const result = await askCreateExamples();
      expect(result).toBe(true);
    });

    test('should return false in non-TTY mode with "n" input', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      const mockOn = jest.fn();
      const mockSetEncoding = jest.fn();
      const mockDestroy = jest.fn();

      Object.defineProperty(process.stdin, 'on', { value: mockOn, writable: true });
      Object.defineProperty(process.stdin, 'setEncoding', { value: mockSetEncoding, writable: true });
      Object.defineProperty(process.stdin, 'destroy', { value: mockDestroy, writable: true });

      // Track read calls to return data then null
      let readCallCount = 0;
      const mockRead = jest.fn(() => {
        readCallCount++;
        if (readCallCount === 1) {
          return 'n';
        }
        return null; // End of input
      });

      Object.defineProperty(process.stdin, 'read', { value: mockRead, writable: true });

      mockOn.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => {
            // Trigger the readable callback
            callback();
          }, 10);
        } else if (event === 'end') {
          setTimeout(() => {
            callback();
          }, 30);
        }
      });

      const result = await askCreateExamples();
      expect(result).toBe(false);
    });
  });

  describe('askAddThemes()', () => {
    test('should return true when user enters "Y" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('Y');
      });

      const result = await askAddThemes();
      expect(result).toBe(true);
      expect(mockQuestion).toHaveBeenCalledWith('Add custom themes to the project? (Y/n) ', expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
    });

    test('should return true when user enters "y" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('y');
      });

      const result = await askAddThemes();
      expect(result).toBe(true);
    });

    test('should return true when user enters empty string in TTY mode (default)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('');
      });

      const result = await askAddThemes();
      expect(result).toBe(true);
    });

    test('should return false when user enters "n" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('n');
      });

      const result = await askAddThemes();
      expect(result).toBe(false);
    });

    test('should return false when user enters "no" in TTY mode', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      mockQuestion.mockImplementationOnce((prompt, callback) => {
        callback('no');
      });

      const result = await askAddThemes();
      expect(result).toBe(false);
    });

    test('should return false in non-TTY mode (default for themes)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      const result = await askAddThemes();
      expect(result).toBe(false);
      expect(mockQuestion).not.toHaveBeenCalled();
    });
  });
});
