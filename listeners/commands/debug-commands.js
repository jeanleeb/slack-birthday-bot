const { Birthday, Config } = require('../../database/models');
const { sequelize } = require('../../database/db');

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

// Manually trigger birthday check (for admins/testing)
const debugCheckBirthdaysCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // This should ideally check if the user is an admin
    // For simplicity, we'll just run the birthday check

    // First respond to the user
    await respond({
      text: 'Running birthday check...',
      response_type: 'ephemeral',
    });

    // Get today's date
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed
    const day = today.getDate().toString().padStart(2, '0');

    logger.info(`Debug check for birthdays on ${month}/${day}...`);

    // Find users whose birthdays are today
    const birthdays = await Birthday.findAll({
      where: sequelize.literal(`
        strftime('%m', birthdate) = '${month}' AND 
        strftime('%d', birthdate) = '${day}'
      `),
    });

    if (birthdays.length === 0) {
      await respond({
        text: 'No birthdays today.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Get the configured birthday channel - prioritize using channelId if available
    const channelIdConfig = await Config.findByPk('birthdayChannelId');
    const channelNameConfig = await Config.findByPk('birthdayChannel');

    // Try to use channel ID first (more reliable), fall back to channel name, then to 'general' as default
    let channel = 'general';
    let channelName = 'general';

    if (channelIdConfig?.value) {
      channel = channelIdConfig.value;
      channelName = channelNameConfig ? channelNameConfig.value : 'unknown';
      logger.info(`Using channel ID: ${channel} (${channelName})`);
    } else if (channelNameConfig?.value) {
      channel = channelNameConfig.value;
      channelName = channel;
      logger.info(`Using channel name: ${channel}`);
    }

    // Send a summary to the command invoker
    await respond({
      text: `Found ${birthdays.length} birthdays today! Sending messages to #${channelName}`,
      response_type: 'ephemeral',
    });

    // Send birthday messages
    for (const birthday of birthdays) {
      try {
        // Always use userMention for consistent tagging
        const userMention = `<@${birthday.userId}>`;

        // Select a random quote
        const quote = quotes[Math.floor(Math.random() * quotes.length)];

        await client.chat.postMessage({
          channel,
          text: `<!channel> Today is ${userMention}'s birthday!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `<!channel> Today is ${userMention}'s birthday!`,
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

        logger.info(`[DEBUG] Sent birthday message for user <@${birthday.userId}>`);
      } catch (messageError) {
        logger.error(`Error sending birthday message for <@${birthday.userId}>:`, messageError);
      }
    }

    await respond({
      text: 'Birthday messages sent successfully!',
      response_type: 'ephemeral',
    });
  } catch (error) {
    logger.error('Error in debugCheckBirthdays command:', error);
    await respond({
      text: `Error running birthday check: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

// Debug command to set a test birthday for today (for testing)
const debugSetTodayBirthdayCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Get today's date
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Format the date as YYYY-MM-DD
    const birthdate = `2000-${month}-${day}`;

    // Save the birthday for testing
    await Birthday.upsert({
      userId: command.user_id,
      username: command.user_name,
      displayName: null, // We no longer use display names in messages
      birthdate,
    });

    await respond({
      text: `Your birthday has been set to today (${day}/${month}) for testing! 🎂\nUse \`/debugcheckbirthdays\` to trigger the birthday messages.`,
      response_type: 'ephemeral',
    });

    logger.info(`DEBUG: Set test birthday for user ${command.user_name} to today (${birthdate})`);

    await respond({
      text: `Your birthday has been set to today (${day}/${month}) for testing! 🎂\nUse \`/debugcheckbirthdays\` to trigger the birthday messages.`,
      response_type: 'ephemeral',
    });

    logger.info(`DEBUG: Set test birthday for user ${command.user_name} to today (${birthdate})`);
  } catch (error) {
    logger.error('Error in debugSetTodayBirthday command:', error);
    await respond({
      text: `Error setting test birthday: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  debugCheckBirthdaysCommandCallback,
  debugSetTodayBirthdayCommandCallback,
};
