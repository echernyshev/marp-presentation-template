const fs = require('fs');
const path = require('path');

afterAll(() => {
  // Final cleanup of test output directory
  const testOutputDir = path.join(__dirname, 'tests', 'output');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }
});
