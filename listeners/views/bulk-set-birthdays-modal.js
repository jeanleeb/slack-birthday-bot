const { Birthday } = require('../../database/models');
const { isAdmin } = require('../../utils/permissions');
const { Op } = require('sequelize');

/**
 * Handler for pagination actions in the bulk birthday setting modal
 */
const handlePagination = async ({ ack, body, action, client, logger }) => {
  try {
    await ack();

    // Parse private metadata
    const metadata = JSON.parse(body.view.private_metadata);
    const { allUsers, currentPage, totalPages, pageSize } = metadata;

    // Calculate new page based on action
    let newPage = currentPage;
    if (action.action_id === 'next_page' && currentPage < totalPages) {
      newPage = currentPage + 1;
    } else if (action.action_id === 'prev_page' && currentPage > 1) {
      newPage = currentPage - 1;
    } else {
      // No page change needed
      return;
    }

    // Calculate index range for the new page
    const startIdx = (newPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, allUsers.length);
    const pageUsers = allUsers.slice(startIdx, endIdx);

    // Create user checkboxes for the new page
    const userCheckboxes = pageUsers.map((user) => ({
      text: {
        type: 'plain_text',
        text: user.name,
        emoji: true,
      },
      value: user.id,
    }));

    // Update metadata with new page number
    const newMetadata = {
      ...metadata,
      currentPage: newPage,
    };

    // Update the modal with the new page of users
    await client.views.update({
      view_id: body.view.id,
      view: {
        type: 'modal',
        callback_id: 'bulk_set_birthdays_modal',
        private_metadata: JSON.stringify(newMetadata),
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
              text: `*Select users and set their birthdays*\nPage ${newPage} of ${totalPages}`,
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
  } catch (error) {
    logger.error(`Error handling pagination: ${error}`);
  }
};

/**
 * Modal callback for the bulk birthday setting modal
 */
const bulkSetBirthdaysModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user ID of the person who submitted the modal
    const userId = body.user.id;

    // Check if the user has admin permissions
    if (!(await isAdmin(userId))) {
      await ack({
        response_action: 'errors',
        errors: {
          user_selection: 'You do not have permission to bulk set birthdays.',
        },
      });
      logger.warn(`Unauthorized admin bulk birthday setting attempt by ${body.user.name} (${userId})`);
      return;
    }

    // Get the selected date
    const selectedDate = view.state.values.date_input.birthdate_picker.selected_date;

    if (!selectedDate) {
      await ack({
        response_action: 'errors',
        errors: {
          date_input: 'Please select a birthday date.',
        },
      });
      return;
    }

    // Get selected users
    const selectedUsers = view.state.values.user_selection.selected_users.selected_options;

    if (!selectedUsers || selectedUsers.length === 0) {
      await ack({
        response_action: 'errors',
        errors: {
          user_selection: 'Please select at least one user.',
        },
      });
      return;
    }

    // Extract day and month from the selected date (format: YYYY-MM-DD)
    const [year, month, day] = selectedDate.split('-').map((part) => Number.parseInt(part, 10));

    // Validate day and month
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      await ack({
        response_action: 'errors',
        errors: {
          date_input: 'Invalid date format. Please select a valid date.',
        },
      });
      return;
    }

    // Acknowledge the modal submission
    await ack();

    // Process each selected user
    const userIds = selectedUsers.map((option) => option.value);
    let successCount = 0;
    let errorCount = 0;
    const skippedCount = 0;

    // Create a formatted birthdate string (YYYY-MM-DD)
    // Use current year as a placeholder, only month and day matter
    const currentYear = new Date().getFullYear();
    const birthdate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    for (const userId of userIds) {
      try {
        // Check if user already has a birthday
        const existingBirthday = await Birthday.findOne({ where: { userId } });

        if (existingBirthday) {
          // Update existing birthday
          await existingBirthday.update({ birthdate });
          successCount++;
        } else {
          // Create new birthday entry
          await Birthday.create({
            userId,
            birthdate,
          });
          successCount++;
        }
      } catch (error) {
        logger.error(`Error setting birthday for user ${userId}: ${error}`);
        errorCount++;
      }
    }

    // Send a message to the user with the results
    try {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `Bulk birthday setting completed with the following results:
• Successfully set/updated: ${successCount}
• Failed: ${errorCount}
• Skipped: ${skippedCount}

All birthdays have been set to ${day}/${month} (DD/MM).`,
      });
    } catch (msgError) {
      logger.error(`Error sending result message: ${msgError}`);
    }
  } catch (error) {
    logger.error(`Error in bulkSetBirthdaysModal: ${error}`);
    await ack({
      response_action: 'errors',
      errors: {
        user_selection: `An error occurred: ${error.message}`,
      },
    });
  }
};

module.exports = {
  bulkSetBirthdaysModalCallback,
  handlePagination,
};
