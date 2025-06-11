const fs = require('fs');
const path = require('path');
const os = require('os');
const ensureFileAndDir = require('../KERNEL_SLATE/shared/utils/ensureFileAndDir');

describe('Credit Minting', () => {
  let tempDir;
  const origCwd = process.cwd();
  const FILES_TO_COPY = [
    'engine/credit_mint.js',
    'KERNEL_SLATE/shared/utils/ensureFileAndDir.js'
  ];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'credit-mint-'));
    for (const relPath of FILES_TO_COPY) {
      const src = path.resolve(relPath);
      const dest = path.join(tempDir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('applies invite code only once and logs mints', () => {
    const creditMint = require(path.join(tempDir, 'engine/credit_mint.js'));
    const invitesPath = path.resolve('admin/invite_codes.json');
    ensureFileAndDir(invitesPath, '[]');
    fs.writeFileSync(invitesPath, JSON.stringify([
      { code: 'TEST', bonus_credits: 20, used: false }
    ], null, 2));

    creditMint.mintCredits('qr_user_001', 100, 'TEST');
    let credits = JSON.parse(fs.readFileSync(path.resolve('admin/credits.json'), 'utf-8'));
    expect(credits['qr_user_001']).toBe(120);
    let invites = JSON.parse(fs.readFileSync(invitesPath, 'utf-8'));
    expect(invites[0].used).toBe(true);

    creditMint.mintCredits('qr_user_002', 100, 'TEST');
    credits = JSON.parse(fs.readFileSync(path.resolve('admin/credits.json'), 'utf-8'));
    expect(credits['qr_user_002']).toBe(100);
    invites = JSON.parse(fs.readFileSync(invitesPath, 'utf-8'));
    expect(invites[0].used).toBe(true);

    const log = JSON.parse(fs.readFileSync(path.resolve('admin/mint_log.json'), 'utf-8'));
    expect(log.length).toBe(2);
    expect(log[0].bonus).toBe(20);
    expect(log[1].bonus).toBe(0);
  });
});
