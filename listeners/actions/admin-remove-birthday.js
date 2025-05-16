const { Birthday } = require('../../database/models');
const { isAdmin } = require('../../utils/permissions');

/**
 * Handle the admin remove birthday button click
 */
const adminRemoveBirthdayActionCallback = async ({ ack, body, client, logger }) => {
  try {
    // Acknowledge the button click
    await ack();

    const adminUserId = body.user.id;
    const targetUserId = body.actions[0].value;

    // Check if the user has admin permissions
    if (!(await isAdmin(adminUserId))) {
      await client.chat.postEphemeral({
        channel: adminUserId,
        user: adminUserId,
        text: 'Sorry, you do not have permission to remove birthdays. This action is restricted to administrators.',
      });
      logger.warn(`Unauthorized admin birthday removal attempt by ${body.user.name} (${adminUserId})`);
      return;
    }

    // Open a confirmation dialog
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'admin_remove_birthday_confirmation_modal',
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
              text: `*Are you sure you want to remove the birthday for <@${targetUserId}>?*\n\nThis action cannot be undone.`,
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
        adminUserId: adminUserId,
        targetUserId: targetUserId,
      }),
    });

    logger.info(`Admin ${body.user.name} (${adminUserId}) initiated birthday removal for user ${targetUserId}`);
  } catch (error) {
    logger.error('Error in adminRemoveBirthdayAction:', error);
  }
};

module.exports = { adminRemoveBirthdayActionCallback };
