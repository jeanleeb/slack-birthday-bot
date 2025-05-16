const { Config } = require('../../database/models');

const birthdayChannelModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Acknowledge the view submission first
    await ack();

    // Get the selected channel ID from the modal
    const channelId = view.state.values.channel_block.channel_select.selected_channel;

    try {
      // Get channel info to verify access and get the channel name
      const channelInfo = await client.conversations.info({
        channel: channelId,
      });

      const channelName = channelInfo.channel.name;

      // Check if bot is in the channel
      const botIsMember = channelInfo.channel.is_member;

      if (!botIsMember) {
        // Bot is not in the channel, try to join
        try {
          await client.conversations.join({
            channel: channelId,
          });

          logger.info(`Bot joined channel #${channelName} (${channelId})`);
        } catch (joinError) {
          // If we can't join, inform the user
          logger.error('Error joining channel:', joinError);

          await client.chat.postEphemeral({
            channel: body.user.id,
            user: body.user.id,
            text: `I need to be invited to <#${channelId}> first. Please add me using \`/invite @slack-birthday-bot\` in that channel and try again.`,
          });

          return;
        }
      }

      // Save the channel configuration - store both ID and name for flexibility
      await Config.upsert({
        key: 'birthdayChannel',
        value: channelName,
      });

      await Config.upsert({
        key: 'birthdayChannelId',
        value: channelId,
      });

      // Send success message
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ Birthday announcements will now be sent to <#${channelId}>! 🎉`,
      });

      logger.info(`Birthday channel set to #${channelName} (${channelId}) by ${body.user.username || body.user.id}`);

      // Send a message to the selected channel to confirm
      await client.chat.postMessage({
        channel: channelId,
        text: `I've been configured to send birthday announcements in this channel! 🎂🎉`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Birthday Bot Configuration*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<@${body.user.id}> has configured me to send birthday announcements in this channel. I'll post a message here whenever it's someone's birthday! 🎂`,
            },
          },
        ],
      });
    } catch (error) {
      logger.error('Error accessing channel info:', error);

      // Handle specific error types
      if (error.data && error.data.error === 'channel_not_found') {
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: `⚠️ I couldn't access that channel. Please make sure it exists and the bot has the necessary permissions.`,
        });
      } else {
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: `⚠️ There was an error setting the birthday channel: ${error.message || 'Unknown error'}`,
        });
      }
    }
  } catch (error) {
    logger.error('Error in birthday channel modal:', error);

    // Try to notify the user about the error
    try {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Something went wrong while setting the birthday channel. Please try again.`,
      });
    } catch (notifyError) {
      logger.error('Failed to notify user of error:', notifyError);
    }
  }
};

module.exports = { birthdayChannelModalCallback };
