const { Birthday } = require('../../database/models');

const removeBirthdayConfirmationCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user ID from the private metadata
    const metadata = JSON.parse(view.private_metadata || '{}');
    const userId = metadata.userId;

    // Acknowledge the view submission
    await ack();

    // Find the birthday
    const birthday = await Birthday.findByPk(userId);

    if (!birthday) {
      // No birthday found, send a message
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        text: 'No birthday found to remove.',
      });
      return;
    }

    // Delete the birthday
    await birthday.destroy();

    // Send confirmation message
    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      text: 'Your birthday has been successfully removed! 🗑️',
    });

    // Update the home tab to reflect the changes
    try {
      const result = await client.apiCall('users.info', {
        user: userId,
      });

      if (result.user?.is_bot === false) {
        await client.views.publish({
          user_id: userId,
          view: {
            type: 'home',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Refreshing your App Home...',
                },
              },
            ],
          },
        });

        // Trigger an app_home_opened event to refresh the home tab
        client.client.emit('app_home_opened', {
          user: userId,
          tab: 'home',
        });
      }
    } catch (err) {
      logger.error('Error refreshing home tab after birthday removal:', err);
    }

    logger.info(`User ${body.user.name} (${userId}) removed their birthday`);
  } catch (error) {
    logger.error('Error in removeBirthdayConfirmation:', error);

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

module.exports = { removeBirthdayConfirmationCallback };
