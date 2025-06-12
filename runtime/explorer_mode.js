const { writeFeeds } = require('../engine/feed_builder');
const path = require('path');

function run() {
  const out = path.resolve('explorer');
  writeFeeds(out);
  console.log('Explorer mode: read-only dashboard generated.');
}

if (require.main === module) run();

module.exports = { run };
