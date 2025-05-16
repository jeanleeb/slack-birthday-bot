const { Birthday } = require('../../database/models');
const { isAdmin } = require('../../utils/permissions');

const adminRemoveBirthdayConfirmationCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user IDs from the private metadata
    const metadata = JSON.parse(view.private_metadata || '{}');
    const adminUserId = metadata.adminUserId;
    const targetUserId = metadata.targetUserId;

    // Check if the user has admin permissions
    if (!(await isAdmin(adminUserId))) {
      await ack({
        response_action: 'errors',
        errors: {
          csv_data_input:
            'You do not have permission to remove birthdays. This action is restricted to administrators.',
        },
      });
      logger.warn(`Unauthorized admin birthday removal attempt by ${body.user.name} (${adminUserId})`);
      return;
    }

    // Acknowledge the view submission
    await ack();

    // Find the birthday
    const birthday = await Birthday.findByPk(targetUserId);

    if (!birthday) {
      // No birthday found, send a message
      await client.chat.postEphemeral({
        channel: adminUserId,
        user: adminUserId,
        text: `No birthday found for <@${targetUserId}>.`,
      });
      return;
    }

    // Store info for logging before deleting
    const birthdateInfo = birthday.birthdate;
    const displayName = birthday.displayName || '';

    // Delete the birthday
    await birthday.destroy();

    // Send confirmation message
    await client.chat.postEphemeral({
      channel: adminUserId,
      user: adminUserId,
      text: `Birthday for <@${targetUserId}> has been successfully removed! 🗑️`,
    });

    // Try to notify the user whose birthday was removed
    try {
      await client.chat.postMessage({
        channel: targetUserId,
        text: `Your birthday has been removed by an administrator. If you would like to set it again, you can use the \`/setbirthday\` command.`,
      });
    } catch (err) {
      logger.warn(`Could not notify user ${targetUserId} about birthday removal: ${err.message}`);
    }

    // Update the home tab for the admin to reflect the changes
    try {
      const result = await client.apiCall('users.info', {
        user: adminUserId,
      });

      if (result.user?.is_bot === false) {
        // Trigger an app_home_opened event to refresh the home tab
        client.client.emit('app_home_opened', {
          user: adminUserId,
          tab: 'home',
        });
      }
    } catch (err) {
      logger.error('Error refreshing home tab after admin birthday removal:', err);
    }

    logger.info(
      `Admin ${body.user.name} (${adminUserId}) removed birthday for user ${targetUserId} (${birthdateInfo}, ${displayName})`,
    );
  } catch (error) {
    logger.error('Error in adminRemoveBirthdayConfirmation:', error);

    // Send error message
    try {
      const userId = body.user.id;
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        text: `Error removing birthday: ${error.message}`,
      });
    } catch (err) {
      logger.error('Error sending error message:', err);
    }
  }
};

module.exports = { adminRemoveBirthdayConfirmationCallback };
