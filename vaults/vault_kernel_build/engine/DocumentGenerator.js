// DocumentGenerator - converts chat logs into markdown vault files
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

function parseChat(chatText) {
  const lines = chatText.split(/\r?\n/).filter(Boolean);
  const systemIntent = lines[0] || '';
  return { systemIntent, fullText: chatText };
}

function generateDocs(parsed, outDir) {
  const files = [];
  ensureFileAndDir(path.join(outDir, 'SystemIntent.md'));
  fs.writeFileSync(path.join(outDir, 'SystemIntent.md'), `# System Intent\n\n${parsed.systemIntent}\n`);
  files.push(path.join(outDir, 'SystemIntent.md'));

  ensureFileAndDir(path.join(outDir, 'T01_LoopRunner.md'));
  fs.writeFileSync(path.join(outDir, 'T01_LoopRunner.md'), parsed.fullText);
  files.push(path.join(outDir, 'T01_LoopRunner.md'));

  ensureFileAndDir(path.join(outDir, 'README.md'));
  fs.writeFileSync(path.join(outDir, 'README.md'), '# Vault Build\nGenerated from chat log.');
  files.push(path.join(outDir, 'README.md'));

  return files;
}

module.exports = { parseChat, generateDocs };
