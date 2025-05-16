const { Birthday, Config } = require('../../database/models');

// Set birthday command handler
const setBirthdayCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the command includes both date and name
    const commandText = command.text.trim();

    // If empty, show help
    if (!commandText) {
      await respond({
        text: 'Please provide your birthday in MM/DD format, followed by your full name. Example: `/setbirthday 12/25 John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Extract date and name
    const firstSpaceIndex = commandText.indexOf(' ');
    let dateInput;
    let displayName;

    if (firstSpaceIndex === -1) {
      // Only date provided
      dateInput = commandText;
      displayName = null;
    } else {
      // Both date and name provided
      dateInput = commandText.substring(0, firstSpaceIndex);
      displayName = commandText.substring(firstSpaceIndex + 1).trim();
    }

    // Parse the date
    const [month, day] = dateInput.split('/');

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
        text: 'Please provide a valid date format (MM/DD). Example: `/setbirthday 12/25 John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
    const birthdate = `2000-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // If no display name was provided, prompt the user for it
    if (!displayName) {
      // Open a modal to get the display name
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'birthday_name_modal',
          private_metadata: birthdate, // Pass the birthdate to the modal submission handler
          title: {
            type: 'plain_text',
            text: 'Add Your Display Name',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Your birthday will be set to *${month}/${day}*. Please provide your full name so we can properly celebrate your birthday!`,
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
              },
              label: {
                type: 'plain_text',
                text: 'Full Name',
              },
            },
          ],
          submit: {
            type: 'plain_text',
            text: 'Save Birthday',
          },
        },
      });
      return;
    }

    // Save or update the birthday with display name
    await Birthday.upsert({
      userId: command.user_id,
      username: command.user_name,
      displayName,
      birthdate,
    });

    await respond({
      text: `Your birthday has been set to ${month}/${day} with display name "${displayName}"! 🎂`,
      response_type: 'ephemeral',
    });

    logger.info(
      `Birthday set for user ${command.user_name} (${command.user_id}): ${birthdate}, Display Name: ${displayName}`,
    );
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

    // Get the channel name (remove # if present)
    let channelName = command.text.trim();
    if (channelName.startsWith('#')) {
      channelName = channelName.substring(1);
    }

    if (!channelName) {
      await respond({
        text: 'Please provide a valid channel name. For example: `/birthdaychannel general`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Verify the channel exists
    try {
      const result = await client.conversations.list({
        exclude_archived: true,
        types: 'public_channel,private_channel',
      });

      const channel = result.channels.find((c) => c.name === channelName);

      if (!channel) {
        await respond({
          text: `Channel #${channelName} not found. Please check the channel name and try again.`,
          response_type: 'ephemeral',
        });
        return;
      }

      // Save the channel configuration
      await Config.upsert({
        key: 'birthdayChannel',
        value: channelName,
      });

      await respond({
        text: `Birthday announcements will now be sent to #${channelName}! 🎉`,
        response_type: 'ephemeral',
      });

      logger.info(`Birthday channel set to #${channelName} by ${command.user_name}`);
    } catch (error) {
      logger.error('Error verifying channel:', error);
      await respond({
        text: "Sorry, I couldn't verify that channel. Please check if the bot has access to it.",
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    logger.error('Error in setBirthdayChannelCommand:', error);
    await respond({
      text: 'Sorry, there was an error setting the birthday channel. Please try again.',
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
        const displayName = birthday.displayName ? ` (${birthday.displayName})` : '';
        return `• <@${birthday.userId}>${displayName}: ${month}/${day}`;
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
        const displayName = birthday.displayName ? ` (${birthday.displayName})` : '';

        if (birthday.daysUntil === 0) {
          return `• <@${birthday.userId}>${displayName}: *TODAY!* 🎉`;
        }

        if (birthday.daysUntil === 1) {
          return `• <@${birthday.userId}>${displayName}: *Tomorrow!* (${birthday.birthMonth}/${birthday.birthDay})`;
        }

        return `• <@${birthday.userId}>${displayName}: In ${birthday.daysUntil} days (${birthday.birthMonth}/${birthday.birthDay})`;
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
