const { sampleCommandCallback } = require('./sample-command');
const {
  setBirthdayCommandCallback,
  setBirthdayChannelCommandCallback,
  listBirthdaysCommandCallback,
  nextBirthdaysCommandCallback,
  removeBirthdayCommandCallback,
} = require('./birthday-commands');
const { debugCheckBirthdaysCommandCallback, debugSetTodayBirthdayCommandCallback } = require('./debug-commands');
const { setDisplayNameCommandCallback } = require('./name-commands');
const {
  adminSetBirthdayCommandCallback,
  adminListBirthdaysCommandCallback,
  adminRemoveBirthdayCommandCallback,
  adminImportBirthdaysCommandCallback,
} = require('./admin-commands');
const { manageAdminsCommandCallback } = require('./admin-management');
const { csvTemplateCommandCallback, validateCsvCommandCallback } = require('./validation-commands');
const { adminBulkRemoveBirthdaysCommandCallback } = require('./admin-bulk-commands');

module.exports.register = (app) => {
  app.command('/sample-command', sampleCommandCallback);

  // Register birthday-related commands
  app.command('/setbirthday', setBirthdayCommandCallback);
  app.command('/birthdaychannel', setBirthdayChannelCommandCallback);
  app.command('/listbirthdays', listBirthdaysCommandCallback);
  app.command('/nextbirthdays', nextBirthdaysCommandCallback);
  app.command('/removebirthday', removeBirthdayCommandCallback);
  app.command('/setname', setDisplayNameCommandCallback);

  // Register admin commands
  app.command('/adminsetbirthday', adminSetBirthdayCommandCallback);
  app.command('/adminlistbirthdays', adminListBirthdaysCommandCallback);
  app.command('/adminremovebirthday', adminRemoveBirthdayCommandCallback);
  app.command('/adminimportbirthdays', adminImportBirthdaysCommandCallback);
  app.command('/manageadmins', manageAdminsCommandCallback);

  // Register validation commands
  app.command('/csvtemplate', csvTemplateCommandCallback);
  app.command('/validatecsv', validateCsvCommandCallback);

  // Register bulk admin commands
  app.command('/adminbulkremove', adminBulkRemoveBirthdaysCommandCallback);

  // Register debug commands
  app.command('/debugcheckbirthdays', debugCheckBirthdaysCommandCallback);
  app.command('/debugsettoday', debugSetTodayBirthdayCommandCallback);
};
