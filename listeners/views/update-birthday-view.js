const { Birthday } = require('../../database/models');

const updateBirthdayViewCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the value from the input
    const birthdayValue = view.state.values.birthday_input.birthday_value.value;
    const displayName = view.state.values.display_name_input?.display_name_value?.value || null;

    // Parse the date input (expecting MM/DD format)
    const [month, day] = birthdayValue.split('/');

    // Validate the input
    if (!month || !day || Number.isNaN(month) || Number.isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      // Acknowledge with an error
      await ack({
        response_action: 'errors',
        errors: {
          birthday_input: 'Please provide a valid date format (MM/DD). For example: 12/25',
        },
      });
      return;
    }

    // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
    const birthdate = `2000-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Get the user ID
    const userId = body.user.id;

    // Save or update the birthday
    await Birthday.upsert({
      userId,
      username: body.user.name,
      displayName,
      birthdate,
    });

    // Acknowledge the submission
    await ack();

    // Send a message to the user confirming their birthday was updated
    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      text: `Your birthday has been updated to ${month}/${day}! 🎂`,
    });

    logger.info(`Birthday updated for user ${body.user.name} (${userId}): ${birthdate}`);
  } catch (error) {
    logger.error('Error in updateBirthdayView:', error);
    // Acknowledge the submission to close the modal even if there was an error
    await ack();
  }
};

module.exports = { updateBirthdayViewCallback };
