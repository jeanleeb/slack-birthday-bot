const { sampleActionCallback } = require('./sample-action');
const { updateBirthdayCallback } = require('./update-birthday');
const { removeBirthdayActionCallback } = require('./remove-birthday');
const { adminRemoveBirthdayActionCallback } = require('./admin-remove-birthday');

module.exports.register = (app) => {
  app.action('sample_action_id', sampleActionCallback);
  app.action('update_birthday', updateBirthdayCallback);
  app.action('remove_birthday', removeBirthdayActionCallback);
  app.action('admin_remove_birthday', adminRemoveBirthdayActionCallback);
};
