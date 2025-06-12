const path = require('path');
const { writeFeeds } = require('../engine/feed_builder');

function run() {
  const outDir = path.resolve('explorer');
  writeFeeds(outDir);
  console.log('Public feed generated at', outDir);
}

if (require.main === module) {
  run();
}

module.exports = { run };
