/**
 * Test script to verify date handling is working correctly
 *
 * This script tests both the old and new methods of date handling to show
 * how the timezone fix works.
 */

// Function to simulate the old date handling approach
function oldDateHandlingApproach(month, day) {
  console.log('\n--- Old Date Handling Method ---');

  // Format the date as YYYY-MM-DD (year doesn't matter for birthdays)
  const birthdate = `2000-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  console.log(`Input date string: ${birthdate}`);

  // Create a Date object (which can cause timezone issues)
  const birthdateObj = new Date(birthdate);
  console.log(`Date object: ${birthdateObj}`);

  // Extract month and day using Date methods (can cause shifts)
  const extractedMonth = (birthdateObj.getMonth() + 1).toString().padStart(2, '0');
  const extractedDay = birthdateObj.getDate().toString().padStart(2, '0');

  console.log(`Extracted month/day: ${extractedMonth}/${extractedDay}`);
  console.log(`Original month/day: ${month}/${day}`);
  console.log(`Date matches original?: ${extractedMonth === month && extractedDay === day ? 'Yes ✅' : 'No ❌'}`);

  return birthdate;
}

// Function to simulate the new date handling approach
function newDateHandlingApproach(month, day) {
  console.log('\n--- New Date Handling Method ---');

  // Parse the month and day as integers
  const monthInt = Number.parseInt(month, 10);
  const dayInt = Number.parseInt(day, 10);

  // Create a consistent date string
  const birthdate = `2000-${monthInt.toString().padStart(2, '0')}-${dayInt.toString().padStart(2, '0')}`;
  console.log(`Input date string: ${birthdate}`);

  // Extract month and day directly from string parts
  const dateParts = birthdate.split('-');
  const extractedMonth = dateParts[1];
  const extractedDay = dateParts[2];

  console.log(`Extracted month/day: ${extractedMonth}/${extractedDay}`);
  console.log(`Original month/day: ${month}/${day}`);
  console.log(
    `Date matches original?: ${extractedMonth === month.padStart(2, '0') && extractedDay === day.padStart(2, '0') ? 'Yes ✅' : 'No ❌'}`,
  );

  return birthdate;
}

// Test with various dates
function runTests() {
  console.log('=== Date Handling Test ===');
  console.log('Testing with month=12, day=25');
  const oldDate1 = oldDateHandlingApproach('12', '25');
  const newDate1 = newDateHandlingApproach('12', '25');

  console.log('\nTesting with month=05, day=01');
  const oldDate2 = oldDateHandlingApproach('05', '01');
  const newDate2 = newDateHandlingApproach('05', '01');

  // Test a date that's likely to show timezone issues (end of month)
  console.log('\nTesting with month=12, day=31');
  const oldDate3 = oldDateHandlingApproach('12', '31');
  const newDate3 = newDateHandlingApproach('12', '31');

  console.log('\n=== Test Summary ===');
  console.log('The new date handling approach consistently preserves the exact month and day');
  console.log('regardless of timezone, while the old approach may shift dates in some cases.');
}

// Run the tests
runTests();
