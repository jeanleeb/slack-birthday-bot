const { sampleViewCallback } = require('./sample-view');
const { updateBirthdayViewCallback } = require('./update-birthday-view');
const { debugBirthdayNameModalCallback } = require('./debug-birthday-name-modal');
const { importBirthdaysModalCallback } = require('./import-birthdays-modal');
const { validateCsvModalCallback } = require('./validate-csv-modal');
const { removeBirthdayConfirmationCallback } = require('./remove-birthday-confirmation');
const { adminRemoveBirthdayConfirmationCallback } = require('./admin-remove-birthday-confirmation');
const { bulkRemoveBirthdaysModalCallback } = require('./bulk-remove-birthdays-modal');
const { bulkSetBirthdaysModalCallback, handlePagination } = require('./bulk-set-birthdays-modal');
const { birthdayChannelModalCallback } = require('./birthday-channel-modal');

module.exports.register = (app) => {
  app.view('sample_view_id', sampleViewCallback);
  app.view('update_birthday_view', updateBirthdayViewCallback);
  app.view('debug_birthday_name_modal', debugBirthdayNameModalCallback);
  app.view('import_birthdays_modal', importBirthdaysModalCallback);
  app.view('validate_csv_modal', validateCsvModalCallback);
  app.view('remove_birthday_confirmation_modal', removeBirthdayConfirmationCallback);
  app.view('admin_remove_birthday_confirmation_modal', adminRemoveBirthdayConfirmationCallback);
  app.view('bulk_remove_birthdays_modal', bulkRemoveBirthdaysModalCallback);
  app.view('bulk_set_birthdays_modal', bulkSetBirthdaysModalCallback);
  app.view('birthday_channel_modal', birthdayChannelModalCallback);
  
  // Register pagination actions for bulk set birthdays modal
  app.action('prev_page', handlePagination);
  app.action('next_page', handlePagination);
};
