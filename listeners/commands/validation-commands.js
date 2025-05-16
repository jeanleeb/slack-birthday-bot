const { isAdmin } = require('../../utils/permissions');
const { createCsvTemplate } = require('../../utils/csv-validator');

/**
 * Command to get a template or example for CSV imports
 */
const csvTemplateCommandCallback = async ({ command, ack, respond, logger }) => {
  try {
    await ack();

    // Create a CSV template
    const template = createCsvTemplate();

    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*CSV Template for Birthday Imports*\n\nUse this format when importing birthdays:',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```\n' + template + '\n```',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Column Format:*\n• User ID: Slack user ID (starts with U)\n• Username: Slack username\n• Display Name: Name used in birthday messages (use quotes if it contains commas)\n• Month: 1-12\n• Day: 1-31',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Use `/adminimportbirthdays` to import your CSV data.',
            },
          ],
        },
      ],
    });

    logger.info(`CSV template requested by ${command.user_name}`);
  } catch (error) {
    logger.error('Error in csvTemplateCommand:', error);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

/**
 * Command to validate a CSV file before importing
 */
const validateCsvCommandCallback = async ({ command, ack, respond, client, logger }) => {
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
        callback_id: 'validate_csv_modal',
        title: {
          type: 'plain_text',
          text: 'Validate CSV',
          emoji: true,
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Validate your CSV data before importing*\n\nPaste your CSV data below to check for errors or warnings without importing.',
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
          text: 'Validate',
          emoji: true,
        },
      },
    });
  } catch (error) {
    logger.error('Error in validateCsvCommand:', error);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  csvTemplateCommandCallback,
  validateCsvCommandCallback,
};
