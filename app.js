const { App, LogLevel } = require('@slack/bolt');
const { config } = require('dotenv');
const { registerListeners } = require('./listeners');
const { setupBirthdayScheduler } = require('./scheduler');
const { testConnection } = require('./database/db');
const { initDatabase } = require('./database/models');

config();

/** Initialization */
// Check if we should use Socket Mode or HTTP mode
const useSocketMode = !process.env.SLACK_REQUEST_URL || process.env.SLACK_REQUEST_URL.trim() === '';

const appConfig = {
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
};

// Configure either Socket Mode or HTTP mode based on environment
if (useSocketMode) {
  appConfig.socketMode = true;
  appConfig.appToken = process.env.SLACK_APP_TOKEN;
  console.log('Starting in Socket Mode');
} else {
  appConfig.signingSecret = process.env.SLACK_SIGNING_SECRET;
  appConfig.port = process.env.PORT || 3000;
  console.log(`Starting in HTTP mode with Request URL: ${process.env.SLACK_REQUEST_URL}`);
}

const app = new App(appConfig);

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
