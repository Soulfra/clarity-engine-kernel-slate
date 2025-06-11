const { startServer, startExperience } = require('./soulfra');

if (process.argv.includes('--cli')) {
  startExperience().then(info => {
    console.log('Vault created at', info.vaultPath);
    if (info.exportPath) {
      console.log('Exported to', info.exportPath);
    }
  });
} else {
  startServer();
}
