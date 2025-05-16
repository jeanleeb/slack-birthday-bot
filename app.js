const { App, LogLevel, ExpressReceiver } = require('@slack/bolt');
const { config } = require('dotenv');
const { registerListeners } = require('./listeners');
const { setupBirthdayScheduler } = require('./scheduler');
const { testConnection } = require('./database/db');
const { initDatabase } = require('./database/models');

config();

/** Initialization */
// Check if we should use Socket Mode or HTTP mode
const useSocketMode = !process.env.SLACK_REQUEST_URL || process.env.SLACK_REQUEST_URL.trim() === '';

let app;
const port = process.env.PORT || 3000;

if (useSocketMode) {
  // Socket Mode configuration
  console.log('Starting in Socket Mode');
  app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.DEBUG,
  });
} else {
  // HTTP Mode configuration
  const requestUrl = process.env.SLACK_REQUEST_URL.trim();
  console.log(`Starting in HTTP mode with Request URL: ${requestUrl}`);

  // Create a custom ExpressReceiver to handle the verification challenge
  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    endpoints: '/slack/events',
    processBeforeResponse: true,
  });

  // Handle Slack's verification challenge
  receiver.router.use('/slack/events', (req, res, next) => {
    // Check if this is a challenge request from Slack
    if (req.body && req.body.type === 'url_verification') {
      const challenge = req.body.challenge;
      console.log(`Received Slack verification challenge: "${challenge}"`);

      try {
        // Respond with the challenge value
        return res.status(200).json({ challenge });
      } catch (error) {
        console.error('Error handling verification challenge:', error);
        return res.status(500).json({ error: 'Failed to process verification challenge' });
      }
    }
    next();
  });

  app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
    logLevel: LogLevel.DEBUG,
  });
}

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
    if (useSocketMode) {
      await app.start();
      app.logger.info('⚡️ Birthday Bot is running in Socket Mode!');
    } else {
      await app.start(port);
      app.logger.info(`⚡️ Birthday Bot is running in HTTP Mode on port ${port}!`);
    }
  } catch (error) {
    console.error('Failed to start the app', error);
  }
})();
