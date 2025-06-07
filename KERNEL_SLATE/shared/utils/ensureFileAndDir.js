// CLARITY_ENGINE Kernel Slate: ensureFileAndDir
// See docs/standards/self-healing-logs-and-files.md
const fs = require('fs');
const path = require('path');

function ensureFileAndDir(filePath, defaultContent = '') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent);
  }
}

module.exports = ensureFileAndDir; 