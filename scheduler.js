const cron = require('node-cron');
const { Op, Sequelize } = require('sequelize');
const { Birthday, Config } = require('./database/models');
const { sequelize } = require('./database/db');

const quotes = [
  'Hoping that your day will be as special as you are.',
  'Count your life by smiles, not tears. Count your age by friends, not years.',
  'May the years continue to be good to you. Happy Birthday!',
  "You're not getting older, you're getting better.",
  'May this year bring with it all the success and fulfillment your heart desires.',
  'Wishing you all the great things in life, hope this day will bring you an extra share of all that makes you happiest.',
  'Happy Birthday, and may all the wishes and dreams you dream today turn to reality.',
  'May this day bring to you all things that make you smile. Happy Birthday!',
  'Your best years are still ahead of you.',
  "Birthdays are filled with yesterday's memories, today's joys, and tomorrow's dreams.",
  'Hoping that your day will be as special as you are.',
  "You'll always be forever young.",
  "Happy Birthday, you're not getting older, you're just a little closer to death.",
  'Birthdays are good for you. Statistics show that people who have the most live the longest!',
  "I'm so glad you were born, because you brighten my life and fill it with joy.",
  'Always remember: growing old is mandatory, growing up is optional.',
  'Better to be over the hill than burried under it.',
  'You always have such fun birthdays, you should have one every year.',
  'Happy birthday to you, a person who is smart, good looking, and funny and reminds me a lot of myself.',
  "We know we're getting old when the only thing we want for our birthday is not to be reminded of it.",
  "Happy Birthday on your very special day, I hope that you don't die before you eat your cake.",
];

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
        // Always use userMention for consistent tagging
        const userMention = `<@${birthday.userId}>`;

        const quote = quotes[(Math.random() * quotes.length) >> 0];

        await app.client.chat.postMessage({
          channel,
          text: `<!channel> Today is  ${userMention}'s birthday!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `<!channel> Today is  ${userMention}'s birthday!`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: quote,
              },
            },
          ],
        });

        app.logger.info(`Sent birthday message for user <@${birthday.userId}>`);
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
