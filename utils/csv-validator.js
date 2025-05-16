/**
 * Utility functions for validating and processing CSV data
 */

/**
 * Validate if a string has valid CSV format
 * @param {string} csvData - CSV data to validate
 * @returns {object} - Validation results with errors and warnings
 */
const validateCsvFormat = (csvData) => {
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!csvData || csvData.trim() === '') {
    results.isValid = false;
    results.errors.push('CSV data is empty');
    return results;
  }

  const lines = csvData.trim().split('\n');

  // Check if there's at least a header and one data row
  if (lines.length < 2) {
    results.isValid = false;
    results.errors.push('CSV must include a header and at least one data row');
    return results;
  }

  // Check header format
  const header = lines[0].toLowerCase().trim();
  if (!header.startsWith('user id') || !header.includes('month') || !header.includes('day')) {
    results.isValid = false;
    results.errors.push('CSV header must include "User ID", "Username", "Display Name", "Month", and "Day" columns');
  }

  // Check each data row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(',');

    // Check if line has enough columns (minimum 5)
    if (parts.length < 5) {
      results.errors.push(`Line ${i + 1}: Not enough columns (should be at least 5)`);
      results.isValid = false;
      continue;
    }

    // Check User ID format
    const userId = parts[0].trim();
    if (!userId.startsWith('U') || userId.length < 8) {
      results.warnings.push(
        `Line ${i + 1}: User ID "${userId}" may not be valid. Slack user IDs typically start with U and are 9+ characters.`,
      );
    }

    // Process complex cases like quoted fields containing commas
    let monthIndex = 2;
    if (parts[2].startsWith('"') && !parts[2].endsWith('"')) {
      // Find the closing quote
      let foundClosingQuote = false;
      for (let j = 3; j < parts.length; j++) {
        if (parts[j].endsWith('"')) {
          monthIndex = j + 1;
          foundClosingQuote = true;
          break;
        }
      }

      if (!foundClosingQuote) {
        results.warnings.push(`Line ${i + 1}: Unclosed quotes in display name`);
      }
    }

    // Check month/day values if available
    if (monthIndex < parts.length) {
      const month = Number.parseInt(parts[monthIndex].trim(), 10);

      if (Number.isNaN(month) || month < 1 || month > 12) {
        results.errors.push(`Line ${i + 1}: Invalid month (must be 1-12)`);
        results.isValid = false;
      }

      if (monthIndex + 1 < parts.length) {
        const day = Number.parseInt(parts[monthIndex + 1].trim(), 10);

        if (Number.isNaN(day) || day < 1 || day > 31) {
          results.errors.push(`Line ${i + 1}: Invalid day (must be 1-31)`);
          results.isValid = false;
        } else if (month) {
          // Check days per month (simplified)
          const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (day > daysInMonth[month]) {
            results.warnings.push(`Line ${i + 1}: Day ${day} may not be valid for month ${month}`);
          }
        }
      } else {
        results.errors.push(`Line ${i + 1}: Missing day value`);
        results.isValid = false;
      }
    } else {
      results.errors.push(`Line ${i + 1}: Missing month and day values`);
      results.isValid = false;
    }
  }

  return results;
};

/**
 * Create a CSV template with sample data
 * @returns {string} - CSV template with sample data
 */
const createCsvTemplate = () => {
  return (
    'User ID,Username,Display Name,Month,Day\n' +
    'U12345678,johndoe,John Doe,12,25\n' +
    'U87654321,janedoe,"Doe, Jane",1,15\n' +
    'UABCDEF12,bobsmith,Bob Smith,7,4'
  );
};

module.exports = {
  validateCsvFormat,
  createCsvTemplate,
};
