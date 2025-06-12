const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

async function scan(imagePath){
  const data = fs.readFileSync(imagePath);
  const text = await QRCode.decode(data).catch(()=>null);
  if(!text) throw new Error('invalid_qr');
  ensureFileAndDir('runtime/scan_log.json','[]');
  const log = JSON.parse(fs.readFileSync('runtime/scan_log.json','utf-8'));
  log.push({ image:imagePath, text, timestamp:new Date().toISOString() });
  fs.writeFileSync('runtime/scan_log.json', JSON.stringify(log,null,2));
  return text;
}

module.exports = { scan };

if (require.main === module) {
  const img = process.argv[2];
  scan(img).then(t=>console.log(t)).catch(e=>console.error(e.message));
}
