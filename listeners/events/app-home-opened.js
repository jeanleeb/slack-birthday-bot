const { Birthday, Config } = require('../../database/models');
const { sequelize } = require('../../database/db');
const { isAdmin, getAdminUserIds } = require('../../utils/permissions');

const appHomeOpenedCallback = async ({ client, event, logger }) => {
  // Ignore the `app_home_opened` event for anything but the Home tab
  if (event.tab !== 'home') return;

  try {
    // Get the configured birthday channel
    const config = await Config.findByPk('birthdayChannel');
    const birthdayChannel = config ? config.value : 'general';

    // Check if user is an admin
    const userIsAdmin = await isAdmin(event.user);
    const adminUserIds = await getAdminUserIds();

    // Get the current user's birthday if set
    const userBirthday = await Birthday.findByPk(event.user);

    // Get upcoming birthdays (next 3)
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Get all birthdays
    const birthdays = await Birthday.findAll();

    // Calculate days until birthday for each user
    const birthdaysWithDaysUntil = birthdays.map((birthday) => {
      // Extract month and day directly from the date string to avoid timezone issues
      const dateParts = birthday.birthdate.split('-');
      const birthMonth = Number.parseInt(dateParts[1], 10); // Convert to number
      const birthDay = Number.parseInt(dateParts[2], 10); // Convert to number

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
        username: birthday.username,
        displayName: birthday.displayName,
        birthMonth,
        birthDay,
        daysUntil: diffDays,
      };
    });

    // Sort by days until birthday and take the next 3
    birthdaysWithDaysUntil.sort((a, b) => a.daysUntil - b.daysUntil);
    const nextBirthdays = birthdaysWithDaysUntil.slice(0, 3);

    // Format upcoming birthdays text and add admin controls if needed
    let upcomingBirthdaysText = 'No birthdays have been set yet.';
    const upcomingBirthdaysBlocks = [];

    if (nextBirthdays.length > 0) {
      if (userIsAdmin) {
        // For admins, show removal buttons next to each birthday
        for (const birthday of nextBirthdays) {
          let birthdayText;
          if (birthday.daysUntil === 0) {
            birthdayText = `<@${birthday.userId}>: *TODAY!* 🎉`;
          } else if (birthday.daysUntil === 1) {
            birthdayText = `<@${birthday.userId}>: *Tomorrow!* (${birthday.birthDay}/${birthday.birthMonth})`;
          } else {
            birthdayText = `<@${birthday.userId}>: In ${birthday.daysUntil} days (${birthday.birthDay}/${birthday.birthMonth})`;
          }

          upcomingBirthdaysBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: birthdayText,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Remove',
                emoji: true,
              },
              value: birthday.userId,
              action_id: 'admin_remove_birthday',
              style: 'danger',
            },
          });
        }
      } else {
        // For regular users, just show the text
        upcomingBirthdaysText = nextBirthdays
          .map((birthday) => {
            if (birthday.daysUntil === 0) {
              return `• <@${birthday.userId}>: *TODAY!* 🎉`;
            }
            if (birthday.daysUntil === 1) {
              return `• <@${birthday.userId}>: *Tomorrow!* (${birthday.birthDay}/${birthday.birthMonth})`;
            }
            return `• <@${birthday.userId}>: In ${birthday.daysUntil} days (${birthday.birthDay}/${birthday.birthMonth})`;
          })
          .join('\n');
      }
    }

    // Build blocks for the home view
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎂 Slack Birthday Bot',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Welcome <@${event.user}>! I'm here to help celebrate birthdays in your workspace.`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Birthday*',
        },
      },
    ];

    // Add user's birthday section
    if (userBirthday) {
      // Extract month and day directly from the date string to avoid timezone issues
      const dateParts = userBirthday.birthdate.split('-');
      const month = Number.parseInt(dateParts[1], 10);
      const day = Number.parseInt(dateParts[2], 10);

      // Get display name info
      const displayNameText = '';

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Your birthday is set to *${day}/${month}*`,
        },
      });

      // Add buttons for update and remove
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Update Birthday',
              emoji: true,
            },
            value: 'update_birthday',
            action_id: 'update_birthday',
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Remove Birthday',
              emoji: true,
            },
            value: 'remove_birthday',
            action_id: 'remove_birthday',
            style: 'danger',
          },
        ],
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "You haven't set your birthday yet. Use the `/setbirthday DD/MM` command to set it.",
        },
      });
    }

    // Add settings section
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Settings*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Birthday messages will be sent to *#${birthdayChannel}*`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Change Channel',
            emoji: true,
          },
          action_id: 'set_birthday_channel',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Upcoming Birthdays*',
        },
      },
    );

    // Add upcoming birthdays blocks or text
    if (userIsAdmin && nextBirthdays.length > 0) {
      // For admins with birthdays, add the interactive blocks
      blocks.push(...upcomingBirthdaysBlocks);
    } else {
      // For regular users or when no birthdays exist
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: upcomingBirthdaysText,
        },
      });
    }

    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Available Commands*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '• `/setbirthday DD/MM` - Set your birthday\n• `/birthdaychannel` - Set the birthday announcement channel\n• `/listbirthdays` - List all saved birthdays\n• `/nextbirthdays` - Show upcoming birthdays\n• `/removebirthday` - Remove your birthday',
        },
      },
    );

    // Add admin section if user is an admin
    if (userIsAdmin) {
      blocks.push(
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Admin Features* 👑',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'You have admin privileges for the Birthday Bot.',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• `/adminsetbirthday @user DD/MM Name` - Set birthday for another user\n• `/adminlistbirthdays` - Get detailed list of all birthdays\n• `/adminremovebirthday @user` - Remove birthday for another user\n• `/adminimportbirthdays` - Import multiple birthdays from CSV\n• `/manageadmins` - Manage admin privileges',
          },
        },
      );

      if (adminUserIds.length > 0) {
        const adminList = adminUserIds.map((id) => `<@${id}>`).join(', ');
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Current Admins:* ${adminList}`,
          },
        });
      } else {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Note:* No admins are configured, so all users currently have admin privileges. Use `/manageadmins add @user` to add an admin.',
          },
        });
      }
    }

    // Publish the home view
    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: blocks,
      },
    });
  } catch (error) {
    logger.error('Error updating app home tab:', error);
  }
};

module.exports = { appHomeOpenedCallback };
