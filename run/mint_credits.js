const { mintCredits } = require('../engine/credit_mint');

const [,, userId, creditStr, invite] = process.argv;
const amount = parseInt(creditStr, 10);

if (!userId || isNaN(amount)) {
  console.log('Usage: node run/mint_credits.js <qr_user_id> <credits_requested> [invite_code]');
  process.exit(1);
}

const result = mintCredits(userId, amount, invite);
console.log(`Minted ${amount} credits${result.bonus ? ` + ${result.bonus} bonus` : ''} for ${userId}`);
