const { Birthday } = require('../../database/models');

const debugBirthdayNameModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the display name from the input
    const displayName = view.state.values.display_name_input.display_name_value.value;

    // Get the birthdate from private_metadata (passed from the command)
    const birthdate = view.private_metadata;

    // Format month/day for display - extract directly from the date string
    const dateParts = birthdate.split('-');
    const month = dateParts[1]; // Already padded with leading zeros
    const day = dateParts[2]; // Already padded with leading zeros

    // Get user info
    const userId = body.user.id;
    const username = body.user.name;

    // Save or update the birthday with display name
    await Birthday.upsert({
      userId,
      username,
      displayName,
      birthdate,
    });

    // Acknowledge the submission
    await ack();

    // Send a confirmation message
    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      text: `Your test birthday has been set to today (${day}/${month}) with display name "${displayName}"! 🎂\nUse \`/debugcheckbirthdays\` to trigger the birthday messages.`,
    });

    logger.info(
      `DEBUG: Set test birthday for user ${username} (${userId}): ${birthdate}, Display Name: ${displayName}`,
    );
  } catch (error) {
    logger.error('Error in debugBirthdayNameModal:', error);

    // Acknowledge with error
    await ack({
      response_action: 'errors',
      errors: {
        display_name_input: 'There was an error saving your test birthday. Please try again.',
      },
    });
  }
};

module.exports = { debugBirthdayNameModalCallback };
