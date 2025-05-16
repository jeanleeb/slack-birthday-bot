const cron = require('node-cron');
const { Op, Sequelize } = require('sequelize');
const { Birthday, Config } = require('./database/models');
const { sequelize } = require('./database/db');

// Setup the birthday scheduler
function setupBirthdayScheduler(app) {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      app.logger.info('Running birthday check...');

      // Get today's date
      const today = new Date();
      const month = (today.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed
      const day = today.getDate().toString().padStart(2, '0');

      app.logger.info(`Checking for birthdays on ${day}/${month}...`);

      // Find users whose birthdays are today
      const birthdays = await Birthday.findAll({
        where: sequelize.literal(`
          strftime('%m', birthdate) = '${month}' AND 
          strftime('%d', birthdate) = '${day}'
        `),
      });

      if (birthdays.length === 0) {
        app.logger.info('No birthdays today.');
        return;
      }

      // Get the configured birthday channel - prioritize using channelId if available
      const channelIdConfig = await Config.findByPk('birthdayChannelId');
      const channelNameConfig = await Config.findByPk('birthdayChannel');

      // Try to use channel ID first (more reliable), fall back to channel name, then to 'general' as default
      let channel = 'general';
      let channelName = 'general';

      if (channelIdConfig && channelIdConfig.value) {
        channel = channelIdConfig.value;
        channelName = channelNameConfig ? channelNameConfig.value : 'unknown';
        app.logger.info(`Using channel ID: ${channel} (${channelName})`);
      } else if (channelNameConfig && channelNameConfig.value) {
        channel = channelNameConfig.value;
        channelName = channel;
        app.logger.info(`Using channel name: ${channel}`);
      }

      app.logger.info(`Found ${birthdays.length} birthdays today! Sending messages to #${channelName}`);

      // Send birthday messages
      for (const birthday of birthdays) {
        // Use display name if available, otherwise use userId for tagging
        const displayName = birthday.displayName || `<@${birthday.userId}>`;
        const userMention = `<@${birthday.userId}>`;

        await app.client.chat.postMessage({
          channel,
          text: `:birthday: Happy Birthday ${displayName} (${userMention})! :cake: :tada:`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:birthday: *Happy Birthday ${displayName}!* :cake: :tada:`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Hey ${userMention}, wishing you a fantastic day filled with joy and celebration! :sparkles:`,
              },
            },
          ],
        });

        app.logger.info(`Sent birthday message for ${birthday.displayName || birthday.username} (${birthday.userId})`);
      }
    } catch (error) {
      app.logger.error('Error in birthday scheduler:', error);
    }
  });

  app.logger.info('Birthday scheduler setup complete');
}

module.exports = {
  setupBirthdayScheduler,
};
