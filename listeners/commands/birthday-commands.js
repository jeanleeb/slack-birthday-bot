const { Birthday, Config } = require('../../database/models');

// Set birthday command handler
const setBirthdayCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the command includes a date
    const commandText = command.text.trim();

    // If empty, show help
    if (!commandText) {
      await respond({
        text: 'Please provide your birthday in DD/MM format. Example: `/setbirthday 25/12`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Extract date (ignore any additional text)
    const firstSpaceIndex = commandText.indexOf(' ');
    let dateInput;

    if (firstSpaceIndex === -1) {
      // Only date provided
      dateInput = commandText;
    } else {
      // Take only the date part
      dateInput = commandText.substring(0, firstSpaceIndex);
    }

    // Parse the date (now in DD/MM format)
    const [day, month] = dateInput.split('/');

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
      await respond({
        text: 'Please provide a valid date format (DD/MM). Example: `/setbirthday 25/12`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
    // Use Date.UTC to create a timezone-independent date
    const monthInt = Number.parseInt(month, 10);
    const dayInt = Number.parseInt(day, 10);

    // Store the date in a consistent format that won't be affected by timezone
    const birthdate = `2000-${monthInt.toString().padStart(2, '0')}-${dayInt.toString().padStart(2, '0')}`;

    // Save or update the birthday
    await Birthday.upsert({
      userId: command.user_id,
      username: command.user_name,
      displayName: null, // We no longer use display names
      birthdate,
    });

    await respond({
      text: `Your birthday has been set to ${day}/${month}! 🎂`,
      response_type: 'ephemeral',
    });

    logger.info(`Birthday set for user ${command.user_name} (${command.user_id}): ${birthdate}`);
  } catch (error) {
    logger.error('Error in setBirthdayCommand:', error);
    await respond({
      text: 'Sorry, there was an error saving your birthday. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

// Set birthday channel command handler
const setBirthdayChannelCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Open a modal with a channel select element for better UX
    await client.views.open({
      trigger_id: command.trigger_id,
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
                text: '👉 Make sure to invite me to the channel first using `/invite @Taq Birthday Bot`',
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
    logger.error('Error opening channel selection modal:', error);
    await respond({
      text: 'Sorry, there was an error opening the channel selection. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

// List all birthdays command handler
const listBirthdaysCommandCallback = async ({ command, ack, respond, logger }) => {
  try {
    await ack();

    // Get all birthdays
    const birthdays = await Birthday.findAll({
      order: [
        [sequelize.fn('strftime', '%m', sequelize.col('birthdate')), 'ASC'],
        [sequelize.fn('strftime', '%d', sequelize.col('birthdate')), 'ASC'],
      ],
    });

    if (birthdays.length === 0) {
      await respond({
        text: 'No birthdays have been set yet.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Format the birthdays list
    const birthdayList = birthdays
      .map((birthday) => {
        const date = new Date(birthday.birthdate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `• <@${birthday.userId}>: ${month}/${day}`;
      })
      .join('\n');

    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎂 Birthday List',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: birthdayList,
          },
        },
      ],
    });

    logger.info(`Birthdays list requested by ${command.user_name}`);
  } catch (error) {
    logger.error('Error in listBirthdaysCommand:', error);
    await respond({
      text: 'Sorry, there was an error retrieving the birthdays. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

// Find next birthdays command handler
const nextBirthdaysCommandCallback = async ({ command, ack, respond, logger }) => {
  try {
    await ack();

    // Get today's date
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Get all birthdays
    const birthdays = await Birthday.findAll();

    if (birthdays.length === 0) {
      await respond({
        text: 'No birthdays have been set yet.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Calculate days until birthday for each user
    const birthdaysWithDaysUntil = birthdays.map((birthday) => {
      const date = new Date(birthday.birthdate);
      const birthMonth = date.getMonth() + 1;
      const birthDay = date.getDate();

      // Create date objects for comparison
      const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay);

      // If birthday has passed this year, use next year's date
      const targetDate = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;

      // Calculate days difference
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        userId: birthday.userId,
        displayName: birthday.displayName,
        birthMonth,
        birthDay,
        daysUntil: diffDays,
      };
    });

    // Sort by days until birthday
    birthdaysWithDaysUntil.sort((a, b) => a.daysUntil - b.daysUntil);

    // Take the next 5 birthdays
    const nextBirthdays = birthdaysWithDaysUntil.slice(0, 5);

    // Format the birthdays list
    const birthdayList = nextBirthdays
      .map((birthday) => {
        if (birthday.daysUntil === 0) {
          return `• <@${birthday.userId}>: *TODAY!* 🎉`;
        }

        if (birthday.daysUntil === 1) {
          return `• <@${birthday.userId}>: *Tomorrow!* (${birthday.birthMonth}/${birthday.birthDay})`;
        }

        return `• <@${birthday.userId}>: In ${birthday.daysUntil} days (${birthday.birthMonth}/${birthday.birthDay})`;
      })
      .join('\n');

    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎂 Upcoming Birthdays',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: birthdayList,
          },
        },
      ],
    });

    logger.info(`Next birthdays requested by ${command.user_name}`);
  } catch (error) {
    logger.error('Error in nextBirthdaysCommand:', error);
    await respond({
      text: 'Sorry, there was an error retrieving upcoming birthdays. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

// Remove birthday command handler
const removeBirthdayCommandCallback = async ({ command, ack, respond, logger }) => {
  try {
    await ack();

    // If user provided an ID, check if they have admin permissions
    const targetUserId = command.text.trim() || command.user_id;

    if (targetUserId !== command.user_id) {
      // For simplicity, we're not implementing permissions check here
      // In a real implementation, you would verify the user has admin privileges
      await respond({
        text: 'Sorry, currently you can only remove your own birthday.',
        response_type: 'ephemeral',
      });
      return;
    }

    // Delete the birthday
    const deleted = await Birthday.destroy({
      where: { userId: targetUserId },
    });

    if (deleted === 0) {
      await respond({
        text:
          targetUserId === command.user_id
            ? "You don't have a birthday set."
            : `<@${targetUserId}> doesn't have a birthday set.`,
        response_type: 'ephemeral',
      });
      return;
    }

    await respond({
      text:
        targetUserId === command.user_id
          ? 'Your birthday has been removed.'
          : `Birthday for <@${targetUserId}> has been removed.`,
      response_type: 'ephemeral',
    });

    logger.info(`Birthday removed for user ID ${targetUserId} by ${command.user_name}`);
  } catch (error) {
    logger.error('Error in removeBirthdayCommand:', error);
    await respond({
      text: 'Sorry, there was an error removing the birthday. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

const { sequelize } = require('../../database/db');

module.exports = {
  setBirthdayCommandCallback,
  setBirthdayChannelCommandCallback,
  listBirthdaysCommandCallback,
  nextBirthdaysCommandCallback,
  removeBirthdayCommandCallback,
};
