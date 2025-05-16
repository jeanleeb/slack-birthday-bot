const { Birthday } = require('../../database/models');

const updateBirthdayCallback = async ({ ack, body, client, logger }) => {
  try {
    await ack();

    // Get the user's current birthday info (if exists)
    const userId = body.user.id;
    const existingBirthday = await Birthday.findByPk(userId);
    let currentBirthdayValue = '';
    let currentDisplayName = '';

    if (existingBirthday) {
      const date = new Date(existingBirthday.birthdate);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      currentBirthdayValue = `${month}/${day}`;
      currentDisplayName = existingBirthday.displayName || '';
    }

    // Open a modal for the user to update their birthday
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'update_birthday_view',
        title: {
          type: 'plain_text',
          text: 'Update Birthday',
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Please update your birthday information:',
            },
          },
          {
            type: 'input',
            block_id: 'birthday_input',
            element: {
              type: 'plain_text_input',
              action_id: 'birthday_value',
              placeholder: {
                type: 'plain_text',
                text: 'MM/DD (e.g., 12/25)',
              },
              initial_value: currentBirthdayValue,
            },
            label: {
              type: 'plain_text',
              text: 'Birthday Date',
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
                text: 'Your full name (e.g., John Doe)',
              },
              initial_value: currentDisplayName,
            },
            label: {
              type: 'plain_text',
              text: 'Display Name',
            },
            optional: true,
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Save',
        },
      },
    });
  } catch (error) {
    logger.error('Error opening birthday update modal:', error);
  }
};

module.exports = { updateBirthdayCallback };
