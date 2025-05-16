const { Birthday } = require('../../database/models');

const updateBirthdayViewCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the value from the input
    const birthdayValue = view.state.values.birthday_input.birthday_value.value;
    const displayName = view.state.values.display_name_input?.display_name_value?.value || null;

    // Parse the date input (expecting DD/MM format)
    const [day, month] = birthdayValue.split('/');

    // Validate the input
    if (
      !month ||
      !day ||
      Number.isNaN(Number(month)) ||
      Number.isNaN(Number(day)) ||
      Number(month) < 1 ||
      Number(month) > 12 ||
      Number(day) < 1 ||
      Number(day) > 31
    ) {
      // Acknowledge with an error
      await ack({
        response_action: 'errors',
        errors: {
          birthday_input: 'Please provide a valid date format (DD/MM). For example: 25/12',
        },
      });
      return;
    }

    // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
    const monthInt = Number.parseInt(month, 10);
    const dayInt = Number.parseInt(day, 10);

    // Store the date in a consistent format that won't be affected by timezone
    const birthdate = `2000-${monthInt.toString().padStart(2, '0')}-${dayInt.toString().padStart(2, '0')}`;

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
      text: `Your birthday has been updated to ${day}/${month}! 🎂`,
    });

    logger.info(`Birthday updated for user ${body.user.name} (${userId}): ${birthdate}`);
  } catch (error) {
    logger.error('Error in updateBirthdayView:', error);
    // Acknowledge the submission to close the modal even if there was an error
    await ack();
  }
};

module.exports = { updateBirthdayViewCallback };
