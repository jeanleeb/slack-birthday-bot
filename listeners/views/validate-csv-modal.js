const { isAdmin } = require('../../utils/permissions');
const { validateCsvFormat } = require('../../utils/csv-validator');

const validateCsvModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user ID of the person who submitted the modal
    const userId = body.user.id;

    // Check if the user has admin permissions
    if (!(await isAdmin(userId))) {
      await ack({
        response_action: 'errors',
        errors: {
          csv_data_input: 'You do not have permission to use this feature.',
        },
      });
      logger.warn(`Unauthorized admin validation attempt by ${body.user.name} (${userId})`);
      return;
    }

    // Get the CSV data from the input
    const csvData = view.state.values.csv_data_input.csv_data_value.value;

    // Validate the CSV format
    const validationResults = validateCsvFormat(csvData);

    // Acknowledge the submission
    await ack();

    // Prepare the response message
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'CSV Validation Results',
          emoji: true,
        },
      },
    ];

    if (validationResults.isValid) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ *CSV format is valid!*\n\nYou can proceed with importing this data using `/adminimportbirthdays`.',
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '❌ *CSV validation failed*\n\nPlease fix the following errors before importing:',
        },
      });
    }

    // Add warnings if any
    if (validationResults.warnings.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Warnings (${validationResults.warnings.length}):*\n${validationResults.warnings.slice(0, 5).join('\n')}`,
        },
      });

      if (validationResults.warnings.length > 5) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `...and ${validationResults.warnings.length - 5} more warnings.`,
          },
        });
      }
    }

    // Add errors if any
    if (validationResults.errors.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Errors (${validationResults.errors.length}):*\n${validationResults.errors.slice(0, 5).join('\n')}`,
        },
      });

      if (validationResults.errors.length > 5) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `...and ${validationResults.errors.length - 5} more errors.`,
          },
        });
      }
    }

    // Add line count information
    const lineCount = csvData.trim().split('\n').length;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*CSV Statistics:*\n• Total lines: ${lineCount}\n• Header: ${csvData.trim().split('\n')[0]}`,
      },
    });

    // Send the validation results
    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      blocks,
    });

    logger.info(
      `Admin ${body.user.name} (${userId}) validated CSV with ${validationResults.errors.length} errors and ${validationResults.warnings.length} warnings`,
    );
  } catch (error) {
    logger.error('Error in validateCsvModal:', error);

    // Acknowledge with error
    await ack({
      response_action: 'errors',
      errors: {
        csv_data_input: `Error validating CSV: ${error.message}`,
      },
    });
  }
};

module.exports = { validateCsvModalCallback };
