const { Birthday } = require('../../database/models');

/**
 * Handle the remove birthday button click
 */
const removeBirthdayActionCallback = async ({ ack, body, client, logger }) => {
  try {
    // Acknowledge the button click
    await ack();

    const userId = body.user.id;

    // Open a confirmation dialog
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'remove_birthday_confirmation_modal',
        title: {
          type: 'plain_text',
          text: 'Remove Birthday',
          emoji: true,
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Are you sure you want to remove your birthday?*\n\nThis action cannot be undone.',
            },
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Remove',
          emoji: true,
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
          emoji: true,
        },
      },
      private_metadata: JSON.stringify({
        userId: userId,
      }),
    });

    logger.info(`User ${body.user.name} (${userId}) initiated birthday removal`);
  } catch (error) {
    logger.error('Error in removeBirthdayAction:', error);
  }
};

module.exports = { removeBirthdayActionCallback };
