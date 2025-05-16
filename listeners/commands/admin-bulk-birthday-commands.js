const { isAdmin } = require('../../utils/permissions');

/**
 * Command to allow an admin to set birthdays for all users in the workspace
 */
const adminBulkSetBirthdaysCommandCallback = async ({ command, ack, respond, client, logger }) => {
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

    logger.info(`Admin bulk birthday setting initiated by ${command.user_name}`);

    // Get all users from the workspace
    try {
      const result = await client.users.list();

      // Filter out bots, deactivated accounts, etc.
      const validUsers = result.members.filter((user) => !user.is_bot && !user.deleted && user.id !== 'USLACKBOT');

      if (validUsers.length === 0) {
        await respond({
          text: 'No valid users found in the workspace.',
          response_type: 'ephemeral',
        });
        return;
      }

      // Open the modal with the first page of users
      const pageSize = 10;
      const initialUsers = validUsers.slice(0, pageSize);
      const totalPages = Math.ceil(validUsers.length / pageSize);

      // Create user checkboxes for the first page
      const userCheckboxes = initialUsers.map((user) => ({
        text: {
          type: 'plain_text',
          text: user.real_name || user.name,
          emoji: true,
        },
        value: user.id,
      }));

      // Store all users in private_metadata for pagination
      const metadata = {
        allUsers: validUsers.map((user) => ({
          id: user.id,
          name: user.real_name || user.name,
        })),
        currentPage: 1,
        totalPages: totalPages,
        pageSize: pageSize,
      };

      // Open modal with user selection
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'bulk_set_birthdays_modal',
          private_metadata: JSON.stringify(metadata),
          title: {
            type: 'plain_text',
            text: 'Set Birthdays for Users',
            emoji: true,
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Select users and set their birthdays*\nPage 1 of ${totalPages}`,
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'input',
              block_id: 'date_input',
              element: {
                type: 'datepicker',
                action_id: 'birthdate_picker',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a date',
                  emoji: true,
                },
              },
              label: {
                type: 'plain_text',
                text: 'Birthday Date (Day & Month)',
                emoji: true,
              },
              hint: {
                type: 'plain_text',
                text: 'Only the day and month will be used, the year is ignored.',
                emoji: true,
              },
            },
            {
              type: 'input',
              block_id: 'user_selection',
              element: {
                type: 'checkboxes',
                action_id: 'selected_users',
                options: userCheckboxes,
              },
              label: {
                type: 'plain_text',
                text: 'Select Users',
                emoji: true,
              },
            },
            {
              type: 'actions',
              block_id: 'pagination_buttons',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Previous',
                    emoji: true,
                  },
                  value: 'prev',
                  action_id: 'prev_page',
                  style: 'danger',
                  confirm: {
                    title: {
                      type: 'plain_text',
                      text: 'Warning',
                    },
                    text: {
                      type: 'plain_text',
                      text: 'Going to the previous page will reset your current selections. Continue?',
                    },
                    confirm: {
                      type: 'plain_text',
                      text: 'Yes',
                    },
                    deny: {
                      type: 'plain_text',
                      text: 'No',
                    },
                  },
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Next',
                    emoji: true,
                  },
                  value: 'next',
                  action_id: 'next_page',
                  style: 'primary',
                  confirm: {
                    title: {
                      type: 'plain_text',
                      text: 'Warning',
                    },
                    text: {
                      type: 'plain_text',
                      text: 'Going to the next page will reset your current selections. Continue?',
                    },
                    confirm: {
                      type: 'plain_text',
                      text: 'Yes',
                    },
                    deny: {
                      type: 'plain_text',
                      text: 'No',
                    },
                  },
                },
              ],
            },
          ],
          submit: {
            type: 'plain_text',
            text: 'Set Birthdays',
            emoji: true,
          },
        },
      });
    } catch (apiError) {
      logger.error(`API Error: ${apiError}`);
      await respond({
        text: `Error fetching users: ${apiError.message}`,
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    logger.error(`Error in adminBulkSetBirthdaysCommand: ${error}`);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  adminBulkSetBirthdaysCommandCallback,
};
