const { processBuybacks } = require('../engine/buyback_engine');

function main() {
  const preview = process.argv.includes('--preview');
  const results = processBuybacks({ preview });
  console.log(JSON.stringify(results, null, 2));
  if (preview) console.log('Preview mode: no changes written');
}

if (require.main === module) {
  main();
}

module.exports = { main };
