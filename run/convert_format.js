const path = require('path');
const { convert } = require('../engine/infinity_router');

const [,, inputFile, ...args] = process.argv;
if (!inputFile) {
  console.log('Usage: node run/convert_format.js <inputFile> --to=format [--user=id]');
  process.exit(1);
}

let format;
let user = 'cli_user';
for (const a of args) {
  if (a.startsWith('--to=')) format = a.split('=')[1];
  if (a.startsWith('--user=')) user = a.split('=')[1];
}

if (!format) {
  console.log('Missing --to=<format>');
  process.exit(1);
}

const extMap = {
  markdown: '.md',
  json: '.json',
  txt: '.txt',
  qr: '.png'
};

const outExt = extMap[format] || '.' + format;
const output = inputFile.replace(/\.[^/.]+$/, outExt);

convert(inputFile).to(output, { userId: user });
console.log('Created', output);
