const { isAdmin } = require('../../utils/permissions');

/**
 * Command to allow an admin to bulk remove birthdays
 */
const adminBulkRemoveBirthdaysCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin command attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Open a modal to get the user IDs
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'bulk_remove_birthdays_modal',
        title: {
          type: 'plain_text',
          text: 'Bulk Remove Birthdays',
          emoji: true,
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Remove birthdays for multiple users at once*\n\nEnter Slack user IDs, separated by commas, spaces, or newlines. You can also use Slack mentions (`@user`).',
            },
          },
          {
            type: 'input',
            block_id: 'user_ids_input',
            element: {
              type: 'plain_text_input',
              action_id: 'user_ids_value',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'U12345678\nU87654321\n@jane.doe',
              },
            },
            label: {
              type: 'plain_text',
              text: 'User IDs to Remove',
              emoji: true,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '⚠️ *Warning:* This action cannot be undone. Users will be notified that their birthday data has been removed by an administrator.',
              },
            ],
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Remove Birthdays',
          emoji: true,
        },
      },
    });
  } catch (error) {
    logger.error('Error in adminBulkRemoveBirthdaysCommand:', error);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  adminBulkRemoveBirthdaysCommandCallback,
};
