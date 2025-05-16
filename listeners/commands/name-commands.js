const { Birthday } = require('../../database/models');

// Set display name command handler
const setDisplayNameCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Get the display name from the command text
    const displayName = command.text.trim();

    if (!displayName) {
      await respond({
        text: 'Please provide your preferred display name. Example: `/setname John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Check if the user has a birthday set
    const existingBirthday = await Birthday.findByPk(command.user_id);

    if (!existingBirthday) {
      await respond({
        text: 'You need to set your birthday first using the `/setbirthday` command.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Update the display name
    existingBirthday.displayName = displayName;
    await existingBirthday.save();

    // Format birthday for the response
    const birthdateObj = new Date(existingBirthday.birthdate);
    const month = (birthdateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = birthdateObj.getDate().toString().padStart(2, '0');

    await respond({
      text: `Your display name has been updated to "${displayName}"! 👤\nYour birthday is still set to ${month}/${day}.`,
      response_type: 'ephemeral',
    });

    logger.info(`Display name updated for user ${command.user_name} (${command.user_id}) to "${displayName}"`);
  } catch (error) {
    logger.error('Error in setDisplayNameCommand:', error);
    await respond({
      text: 'Sorry, there was an error updating your display name. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  setDisplayNameCommandCallback,
};
