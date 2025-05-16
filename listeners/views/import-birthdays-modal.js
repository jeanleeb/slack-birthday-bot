const { Birthday } = require('../../database/models');
const { isAdmin } = require('../../utils/permissions');
const { validateCsvFormat } = require('../../utils/csv-validator');

const importBirthdaysModalCallback = async ({ ack, body, view, client, logger }) => {
  try {
    // Get the user ID of the person who submitted the modal
    const userId = body.user.id;

    // Check if the user has admin permissions
    if (!(await isAdmin(userId))) {
      await ack({
        response_action: 'errors',
        errors: {
          csv_data_input: 'You do not have permission to import birthdays.',
        },
      });
      logger.warn(`Unauthorized admin import attempt by ${body.user.name} (${userId})`);
      return;
    }

    // Get the CSV data from the input
    const csvData = view.state.values.csv_data_input.csv_data_value.value;

    // Validate the CSV format first
    if (!csvData || csvData.trim() === '') {
      await ack({
        response_action: 'errors',
        errors: {
          csv_data_input: 'Please provide CSV data for the import.',
        },
      });
      return;
    }

    // Perform detailed CSV validation
    const validationResults = validateCsvFormat(csvData);

    if (!validationResults.isValid) {
      // Get the first few errors to display
      const errorMessages = validationResults.errors.slice(0, 3).join('\n');
      await ack({
        response_action: 'errors',
        errors: {
          csv_data_input: `CSV validation failed:\n${errorMessages}${validationResults.errors.length > 3 ? '\n...and more errors' : ''}`,
        },
      });
      return;
    }

    // Parse the CSV data
    const lines = csvData.trim().split('\n');

    // Track success and errors
    const results = {
      success: 0,
      errors: [],
      warnings: [],
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('User ID,')) continue; // Skip header or empty lines

      const parts = line.split(',');

      // Basic validation of the CSV format
      if (parts.length < 4) {
        results.errors.push(`Line ${i + 1}: Not enough columns (should be 4)`);
        continue;
      }

      try {
        const userIdPart = parts[0].trim();
        const usernamePart = parts[1].trim();

        // Validate user ID format (should start with U and be around 9 characters)
        if (!userIdPart.startsWith('U') || userIdPart.length < 8) {
          results.warnings.push(
            `Line ${i + 1}: User ID "${userIdPart}" may not be valid. Slack user IDs typically start with U and are 9+ characters.`,
          );
        }

        const monthPart = parts[2].trim();
        const dayPart = parts[3].trim();

        // Validate month and day
        const month = Number.parseInt(monthPart, 10);
        const day = Number.parseInt(dayPart, 10);

        if (Number.isNaN(month) || Number.isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
          results.errors.push(`Line ${i + 1}: Invalid month or day (${monthPart}/${dayPart})`);
          continue;
        }

        // Additional validation for days in month
        const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonth[month]) {
          results.warnings.push(`Line ${i + 1}: Day ${day} may not be valid for month ${month}`);
        }

        // Format the date as YYYY-MM-DD
        const birthdate = `2000-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Save or update the birthday
        await Birthday.upsert({
          userId: userIdPart,
          username: usernamePart,
          displayName: null, // We no longer use display names
          birthdate,
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    // Acknowledge the submission
    await ack();

    // Send a confirmation message
    const responseText = `Successfully imported ${results.success} birthdays.`;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: responseText,
        },
      },
    ];

    if (results.warnings.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Warnings (${results.warnings.length}):*\n${results.warnings.slice(0, 5).join('\n')}`,
        },
      });

      if (results.warnings.length > 5) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `...and ${results.warnings.length - 5} more warnings.`,
          },
        });
      }
    }

    if (results.errors.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Errors (${results.errors.length}):*\n${results.errors.slice(0, 5).join('\n')}`,
        },
      });

      if (results.errors.length > 5) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `...and ${results.errors.length - 5} more errors.`,
          },
        });
      }
    }

    await client.chat.postEphemeral({
      channel: userId,
      user: userId,
      blocks,
    });

    logger.info(
      `Admin ${body.user.name} (${userId}) imported ${results.success} birthdays with ${results.errors.length} errors`,
    );
  } catch (error) {
    logger.error('Error in importBirthdaysModal:', error);

    // Acknowledge with error
    await ack({
      response_action: 'errors',
      errors: {
        csv_data_input: `Error importing birthdays: ${error.message}`,
      },
    });
  }
};

module.exports = { importBirthdaysModalCallback };
