const { Birthday, Config } = require('../../database/models');
const { sequelize } = require('../../database/db');

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
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed
    const day = today.getDate();

    // Find users whose birthdays are today
    const birthdays = await Birthday.findAll({
      where: sequelize.literal(`
        strftime('%m', birthdate) = '${month.toString().padStart(2, '0')}' AND 
        strftime('%d', birthdate) = '${day.toString().padStart(2, '0')}'
      `),
    });

    if (birthdays.length === 0) {
      await respond({
        text: 'No birthdays today.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Get the configured birthday channel
    const config = await Config.findByPk('birthdayChannel');
    const channel = config ? config.value : 'general';

    // Send a summary to the command invoker
    await respond({
      text: `Found ${birthdays.length} birthdays today! Sending messages to #${channel}`,
      response_type: 'ephemeral',
    });

    // Send birthday messages
    for (const birthday of birthdays) {
      // Use display name if available, otherwise use userId for tagging
      const displayName = birthday.displayName || `<@${birthday.userId}>`;
      const userMention = `<@${birthday.userId}>`;

      await client.chat.postMessage({
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

      logger.info(
        `[DEBUG] Sent birthday message for ${birthday.displayName || birthday.username} (${birthday.userId})`,
      );
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

    // Check if the command includes a display name
    const displayName = command.text.trim() || null;

    if (!displayName) {
      // Open a modal to get the display name
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'debug_birthday_name_modal',
          private_metadata: birthdate, // Pass the birthdate to the modal submission handler
          title: {
            type: 'plain_text',
            text: 'Add Test Birthday Name',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Your birthday will be set to today (*${month}/${day}*) for testing. Please provide a display name to use in the birthday message.`,
              },
            },
            {
              type: 'input',
              block_id: 'display_name_input',
              element: {
                type: 'plain_text_input',
                action_id: 'display_name_value',
                placeholder: {
                  type: 'plain_text',
                  text: 'Your test display name (e.g., John Doe)',
                },
              },
              label: {
                type: 'plain_text',
                text: 'Display Name',
              },
            },
          ],
          submit: {
            type: 'plain_text',
            text: 'Save Test Birthday',
          },
        },
      });
      return;
    }

    // Save or update the birthday with the display name
    await Birthday.upsert({
      userId: command.user_id,
      username: command.user_name,
      displayName,
      birthdate,
    });

    await respond({
      text: `Your birthday has been set to today (${month}/${day}) with display name "${displayName}" for testing! 🎂\nUse \`/debugcheckbirthdays\` to trigger the birthday messages.`,
      response_type: 'ephemeral',
    });

    logger.info(
      `DEBUG: Set test birthday for user ${command.user_name} to today (${birthdate}) with display name "${displayName}"`,
    );
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
