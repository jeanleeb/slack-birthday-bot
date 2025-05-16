const setBirthdayChannelActionCallback = async ({ body, ack, client, logger }) => {
  try {
    // Acknowledge the button click
    await ack();

    // Open the channel selection modal
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'birthday_channel_modal',
        title: {
          type: 'plain_text',
          text: 'Set Birthday Channel',
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Select the channel where birthday announcements should be posted:',
            },
          },
          {
            type: 'input',
            block_id: 'channel_block',
            element: {
              type: 'channels_select',
              action_id: 'channel_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select a channel',
              },
            },
            label: {
              type: 'plain_text',
              text: 'Birthday Announcement Channel',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '👉 Make sure to invite me to the channel first using `/invite @slack-birthday-bot`',
              },
            ],
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Save',
        },
      },
    });
  } catch (error) {
    logger.error('Error opening channel selection modal from home:', error);
  }
};

module.exports = { setBirthdayChannelActionCallback };
