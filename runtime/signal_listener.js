const path = require('path');
const fs = require('fs');
const loopRouter = require('../engine/loop_router');

const SIGNAL_LOG = path.resolve(__dirname, 'signal_log.json');

function start(interval = 5000) {
  loopRouter.routeSignals();
  fs.watchFile(SIGNAL_LOG, { interval }, () => {
    loopRouter.routeSignals();
  });
}

if (require.main === module) {
  start();
}

module.exports = { start };
