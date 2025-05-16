/**
 * Utility functions for handling permissions in the app
 */
const { Config } = require('../database/models');

// Default admin user IDs (can be overridden through the database)
const DEFAULT_ADMIN_USER_IDS = [
  // Add IDs of users who should have admin permissions by default
  // Example: 'U12345678'
];

/**
 * Get the list of admin user IDs from the database
 * @returns {Promise<string[]>} - Array of admin user IDs
 */
const getAdminUserIds = async () => {
  try {
    // Check if we have admin users configured in the database
    const adminConfig = await Config.findByPk('adminUsers');

    if (adminConfig?.value) {
      // Parse the admin user IDs from the database
      return adminConfig.value.split(',').map((id) => id.trim());
    }

    // If no admins are configured in the database, use the default list
    return DEFAULT_ADMIN_USER_IDS;
  } catch (error) {
    console.error('Error retrieving admin user IDs:', error);
    // In case of error, fall back to the default admin user IDs
    return DEFAULT_ADMIN_USER_IDS;
  }
};

/**
 * Check if a user has admin permissions
 * @param {string} userId - The Slack user ID to check
 * @returns {Promise<boolean>} - Whether the user has admin permissions
 */
const isAdmin = async (userId) => {
  const adminUserIds = await getAdminUserIds();

  // If no admins are defined, anyone has admin permissions
  if (adminUserIds.length === 0) {
    return true;
  }

  return adminUserIds.includes(userId);
};

/**
 * Add a user to the admin list
 * @param {string} userId - The Slack user ID to add as admin
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
const addAdmin = async (userId) => {
  try {
    const adminUserIds = await getAdminUserIds();

    // Check if the user is already an admin
    if (adminUserIds.includes(userId)) {
      return true;
    }

    // Add the user to the admin list
    adminUserIds.push(userId);

    // Save the updated admin list to the database
    await Config.upsert({
      key: 'adminUsers',
      value: adminUserIds.join(','),
    });

    return true;
  } catch (error) {
    console.error('Error adding admin user:', error);
    return false;
  }
};

/**
 * Remove a user from the admin list
 * @param {string} userId - The Slack user ID to remove from admin list
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
const removeAdmin = async (userId) => {
  try {
    const adminUserIds = await getAdminUserIds();

    // Check if the user is an admin
    if (!adminUserIds.includes(userId)) {
      return true;
    }

    // Remove the user from the admin list
    const updatedAdmins = adminUserIds.filter((id) => id !== userId);

    // Save the updated admin list to the database
    await Config.upsert({
      key: 'adminUsers',
      value: updatedAdmins.join(','),
    });

    return true;
  } catch (error) {
    console.error('Error removing admin user:', error);
    return false;
  }
};

module.exports = {
  isAdmin,
  getAdminUserIds,
  addAdmin,
  removeAdmin,
};
