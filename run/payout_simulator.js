const { runPayoutEngine } = require('../admin/payout_engine');

function main() {
  const summary = runPayoutEngine();
  console.log('Payout summary saved to admin/payout_summary.json');
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { main };
