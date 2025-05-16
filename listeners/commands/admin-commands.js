const { Birthday } = require('../../database/models');
const { sequelize } = require('../../database/db');
const { isAdmin } = require('../../utils/permissions');

// Command to allow an admin to set a birthday for another user
const adminSetBirthdayCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin command attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Check if command text is provided
    const commandText = command.text.trim();

    if (!commandText) {
      await respond({
        text: 'Please provide a user ID or mention, followed by the date (MM/DD) and optional display name. Example: `/adminsetbirthday @user 12/25 John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Parse the command text to extract user, date, and name
    // Handle different formats like @user, <@USER_ID>, or just USER_ID
    const parts = commandText.split(' ');

    if (parts.length < 2) {
      await respond({
        text: 'Please provide both a user and a date. Example: `/adminsetbirthday @user 12/25 John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Extract the user ID from the first part
    let targetUserId = parts[0];

    // Handle Slack mention format <@USER_ID>
    if (targetUserId.startsWith('<@') && targetUserId.endsWith('>')) {
      targetUserId = targetUserId.substring(2, targetUserId.length - 1);

      // Handle the case where there might be a | character in the mention (e.g., <@USER_ID|username>)
      const pipeIndex = targetUserId.indexOf('|');
      if (pipeIndex !== -1) {
        targetUserId = targetUserId.substring(0, pipeIndex);
      }
    }

    // Handle @ prefix without brackets
    if (targetUserId.startsWith('@')) {
      targetUserId = targetUserId.substring(1);

      // Need to look up the user ID from the username
      try {
        const result = await client.users.lookupByEmail({
          email: `${targetUserId}@example.com`, // This is a placeholder, but you'd need a better way to look up users
        });

        if (result.user?.id) {
          targetUserId = result.user.id;
        }
      } catch (error) {
        // If lookup fails, we'll use the username as provided
        logger.warn(`Could not look up user ID for ${targetUserId}`);
      }
    }

    // Get the date part (second item in the array)
    const dateInput = parts[1];
    const [month, day] = dateInput.split('/');

    // Validate the date
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
        text: 'Please provide a valid date format (MM/DD). Example: `/adminsetbirthday @user 12/25 John Doe`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
    const birthdate = `2000-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Extract the display name (everything after the date)
    const displayName = parts.slice(2).join(' ').trim() || null;

    // Get user info if possible
    let username = targetUserId; // Default to using the ID as the username
    try {
      const userInfo = await client.users.info({ user: targetUserId });
      if (userInfo.user?.name) {
        username = userInfo.user.name;
      }
    } catch (error) {
      logger.warn(`Could not fetch user info for ${targetUserId}`);
    }

    // Save or update the birthday
    await Birthday.upsert({
      userId: targetUserId,
      username: username,
      displayName: displayName,
      birthdate,
    });

    const formattedDate = `${month}/${day}`;
    const nameInfo = displayName ? ` with display name "${displayName}"` : '';

    await respond({
      text: `Birthday for <@${targetUserId}> set to ${formattedDate}${nameInfo}! 🎂`,
      response_type: 'ephemeral',
    });

    logger.info(
      `Admin ${command.user_name} (${command.user_id}) set birthday for user ${targetUserId}: ${birthdate}, Display Name: ${displayName}`,
    );
  } catch (error) {
    logger.error('Error in adminSetBirthdayCommand:', error);
    await respond({
      text: `Sorry, there was an error setting the birthday: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

// Command to allow an admin to get a detailed list of all birthdays
const adminListBirthdaysCommandCallback = async ({ command, ack, respond, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin command attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Get all birthdays ordered by month and day
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

    // Format the birthdays list with all details
    const birthdayList = birthdays
      .map((birthday) => {
        const date = new Date(birthday.birthdate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const displayName = birthday.displayName ? ` (${birthday.displayName})` : '';
        const username = birthday.username ? ` - Username: ${birthday.username}` : '';
        return `• <@${birthday.userId}>${displayName}${username}: ${month}/${day} - ID: ${birthday.userId}`;
      })
      .join('\n');

    // Create a CSV-formatted string for easy export
    const csvData = [
      'User ID,Username,Display Name,Month,Day',
      ...birthdays.map((birthday) => {
        const date = new Date(birthday.birthdate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const displayName = birthday.displayName || '';
        const username = birthday.username || '';
        return `${birthday.userId},${username},"${displayName}",${month},${day}`;
      }),
    ].join('\n');

    // Create a JSON-formatted string as an alternative export format
    const jsonData = JSON.stringify(
      birthdays.map((birthday) => {
        const date = new Date(birthday.birthdate);
        return {
          userId: birthday.userId,
          username: birthday.username || '',
          displayName: birthday.displayName || '',
          month: date.getMonth() + 1,
          day: date.getDate(),
        };
      }),
      null,
      2,
    );

    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎂 All Birthdays (Admin View)',
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
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*CSV Data (Copy for export):*\n\`\`\`\n${csvData}\n\`\`\``,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*JSON Data (Copy for advanced import):*\n\`\`\`\n${jsonData}\n\`\`\``,
          },
        },
      ],
    });

    logger.info(`Admin birthday list requested by ${command.user_name}`);
  } catch (error) {
    logger.error('Error in adminListBirthdaysCommand:', error);
    await respond({
      text: 'Sorry, there was an error retrieving the birthday list. Please try again.',
      response_type: 'ephemeral',
    });
  }
};

// Command to allow an admin to remove a birthday for another user
const adminRemoveBirthdayCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin command attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Check if command text is provided
    const commandText = command.text.trim();

    if (!commandText) {
      await respond({
        text: 'Please provide a user ID or mention. Example: `/adminremovebirthday @user`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Extract the user ID from the command text
    let targetUserId = commandText;

    // Handle Slack mention format <@USER_ID>
    if (targetUserId.startsWith('<@') && targetUserId.endsWith('>')) {
      targetUserId = targetUserId.substring(2, targetUserId.length - 1);

      // Handle the case where there might be a | character in the mention (e.g., <@USER_ID|username>)
      const pipeIndex = targetUserId.indexOf('|');
      if (pipeIndex !== -1) {
        targetUserId = targetUserId.substring(0, pipeIndex);
      }
    }

    // Handle @ prefix without brackets
    if (targetUserId.startsWith('@')) {
      targetUserId = targetUserId.substring(1);

      try {
        const result = await client.users.lookupByEmail({
          email: `${targetUserId}@example.com`, // This is a placeholder
        });

        if (result.user?.id) {
          targetUserId = result.user.id;
        }
      } catch (error) {
        logger.warn(`Could not look up user ID for ${targetUserId}`);
      }
    }

    // Find the birthday
    const birthday = await Birthday.findByPk(targetUserId);

    if (!birthday) {
      await respond({
        text: `No birthday found for <@${targetUserId}>.`,
        response_type: 'ephemeral',
      });
      return;
    }

    // Delete the birthday
    await birthday.destroy();

    await respond({
      text: `Birthday for <@${targetUserId}> has been removed! 🗑️`,
      response_type: 'ephemeral',
    });

    logger.info(`Admin ${command.user_name} (${command.user_id}) removed birthday for user ${targetUserId}`);
  } catch (error) {
    logger.error('Error in adminRemoveBirthdayCommand:', error);
    await respond({
      text: `Sorry, there was an error removing the birthday: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

// Command to allow an admin to import birthdays in bulk
const adminImportBirthdaysCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin command attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Open a modal to get the CSV data
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'import_birthdays_modal',
        title: {
          type: 'plain_text',
          text: 'Import Birthdays',
          emoji: true,
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Paste CSV data with the following columns:*\n`User ID,Username,Display Name,Month,Day`\n\nEach field should contain:\n• User ID: Slack user ID (starts with U)\n• Username: Slack username\n• Display Name: Name to use in birthday messages (can include spaces, use quotes if it contains commas)\n• Month: 1-12\n• Day: 1-31',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Examples:*\n```\nUser ID,Username,Display Name,Month,Day\nU12345678,johndoe,John Doe,12,25\nU87654321,janedoe,"Doe, Jane",1,15\n```\n\nYou can get this format by using the `/adminlistbirthdays` command and copying the CSV data section.',
            },
          },
          {
            type: 'input',
            block_id: 'csv_data_input',
            element: {
              type: 'plain_text_input',
              action_id: 'csv_data_value',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'User ID,Username,Display Name,Month,Day\nU12345678,johndoe,John Doe,12,25\nU87654321,janedoe,Jane Doe,1,15',
              },
            },
            label: {
              type: 'plain_text',
              text: 'CSV Data',
              emoji: true,
            },
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Import',
          emoji: true,
        },
      },
    });
  } catch (error) {
    logger.error('Error in adminImportBirthdaysCommand:', error);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  adminSetBirthdayCommandCallback,
  adminListBirthdaysCommandCallback,
  adminRemoveBirthdayCommandCallback,
  adminImportBirthdaysCommandCallback,
};
