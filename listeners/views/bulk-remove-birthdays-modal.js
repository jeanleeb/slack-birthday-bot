const { Birthday } = require('../../database/models');
const { isAdmin } = require('../../utils/permissions');

const bulkRemoveBirthdaysModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user ID of the person who submitted the modal
    const userId = body.user.id;

    // Check if the user has admin permissions
    if (!(await isAdmin(userId))) {
      await ack({
        response_action: 'errors',
        errors: {
          user_ids_input: 'You do not have permission to bulk remove birthdays.',
        },
      });
      logger.warn(`Unauthorized admin bulk removal attempt by ${body.user.name} (${userId})`);
      return;
    }

    // Get the user IDs from the input
    const userIdsInput = view.state.values.user_ids_input.user_ids_value.value;

    if (!userIdsInput || userIdsInput.trim() === '') {
      await ack({
        response_action: 'errors',
        errors: {
          user_ids_input: 'Please provide at least one user ID to remove.',
        },
      });
      return;
    }

    // Parse the user IDs (split by commas, spaces, or newlines)
    const userIds = userIdsInput
      .split(/[\s,]+/)
      .map((id) => {
        // Remove any @ symbols and handle <@ID> format
        let cleanId = id.trim();

        if (cleanId.startsWith('<@') && cleanId.endsWith('>')) {
          cleanId = cleanId.substring(2, cleanId.length - 1);

          // Handle pipe character in mention
          const pipeIndex = cleanId.indexOf('|');
          if (pipeIndex !== -1) {
            cleanId = cleanId.substring(0, pipeIndex);
          }
        } else if (cleanId.startsWith('@')) {
          cleanId = cleanId.substring(1);
        }

        return cleanId;
      })
      .filter((id) => id.length > 0);

    // Acknowledge the submission
    await ack();

    // Track results
    const results = {
      success: 0,
      notFound: 0,
      userIds: [],
    };

    // Process each user ID
    for (const targetUserId of userIds) {
      try {
        // Find and remove the birthday
        const birthday = await Birthday.findByPk(targetUserId);

        if (birthday) {
          // Store user info before deletion for the report
          results.userIds.push({
            userId: targetUserId,
            success: true,
            displayName: birthday.displayName || '',
            username: birthday.username || '',
          });

          // Delete the birthday
          await birthday.destroy();
          results.success++;
        } else {
          results.userIds.push({
            userId: targetUserId,
            success: false,
            reason: 'not_found',
          });
          results.notFound++;
        }
      } catch (error) {
        logger.error(`Error removing birthday for user ${targetUserId}:`, error);
        results.userIds.push({
          userId: targetUserId,
          success: false,
          reason: 'error',
          error: error.message,
        });
      }
    }

    // Create the response message
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Bulk Birthday Removal Results',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n• Successfully removed: ${results.success} birthdays\n• Not found: ${results.notFound}\n• Total processed: ${userIds.length}`,
        },
      },
    ];

    // Add details about each user
    if (results.userIds.length > 0) {
      let detailsText = '*Details:*\n';

      for (const result of results.userIds) {
        if (result.success) {
          const nameInfo = result.displayName ? ` (${result.displayName})` : '';
          detailsText += `• <@${result.userId}>${nameInfo}: ✅ Removed\n`;
        } else {
          detailsText += `• <@${result.userId}>: ❌ ${result.reason === 'not_found' ? 'No birthday found' : `Error: ${result.error}`}\n`;
        }
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: detailsText,
        },
      });
    }

    // Send the results message
    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      blocks,
    });

    logger.info(`Admin ${body.user.name} (${userId}) bulk removed ${results.success} birthdays`);

    // Update the app home for the admin
    try {
      client.client.emit('app_home_opened', {
        user: userId,
        tab: 'home',
      });
    } catch (err) {
      logger.error('Error refreshing home tab after bulk removal:', err);
    }
  } catch (error) {
    logger.error('Error in bulkRemoveBirthdaysModal:', error);

    // Acknowledge with error
    try {
      await ack();

      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `Error processing bulk removal: ${error.message}`,
      });
    } catch (err) {
      logger.error('Error sending error message:', err);
    }
  }
};

module.exports = { bulkRemoveBirthdaysModalCallback };
