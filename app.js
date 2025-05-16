const { App, LogLevel } = require('@slack/bolt');
const { config } = require('dotenv');
const { registerListeners } = require('./listeners');
const { setupBirthdayScheduler } = require('./scheduler');
const { testConnection } = require('./database/db');
const { initDatabase } = require('./database/models');

config();

/** Initialization */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
});

/** Register Listeners */
registerListeners(app);

/** Initialize Database and Start the App */
(async () => {
  try {
    // Initialize and test database connection
    await testConnection();
    await initDatabase();

    // Setup birthday scheduler
    setupBirthdayScheduler(app);

    // Start the app
    await app.start();
    app.logger.info('⚡️ Birthday Bot is running!');
  } catch (error) {
    console.error('Failed to start the app', error);
  }
})();
