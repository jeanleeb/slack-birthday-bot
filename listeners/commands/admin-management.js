const { addAdmin, removeAdmin, getAdminUserIds } = require('../../utils/permissions');
const { isAdmin } = require('../../utils/permissions');

// Command to manage admin permissions
const manageAdminsCommandCallback = async ({ command, ack, respond, client, logger }) => {
  try {
    await ack();

    // Check if the user has admin permissions
    if (!(await isAdmin(command.user_id))) {
      await respond({
        text: 'Sorry, you do not have permission to use this command. This command is restricted to administrators.',
        response_type: 'ephemeral',
      });
      logger.warn(`Unauthorized admin management attempt by ${command.user_name} (${command.user_id})`);
      return;
    }

    // Parse the command text
    const commandText = command.text.trim();

    // If no arguments, show help and current admin list
    if (!commandText) {
      const currentAdmins = await getAdminUserIds();
      const adminList =
        currentAdmins.length > 0
          ? currentAdmins.map((id) => `• <@${id}>`).join('\n')
          : 'No admins configured (all users have admin privileges)';

      await respond({
        text: `*Admin Management Commands*\n\n• \`/manageadmins add @user\` - Add an admin\n• \`/manageadmins remove @user\` - Remove an admin\n• \`/manageadmins list\` - List current admins\n\n*Current Admins:*\n${adminList}`,
        response_type: 'ephemeral',
      });
      return;
    }

    // Parse the action and user
    const parts = commandText.split(' ');
    const action = parts[0].toLowerCase();

    if (action === 'list') {
      // List current admins
      const currentAdmins = await getAdminUserIds();
      const adminList =
        currentAdmins.length > 0
          ? currentAdmins.map((id) => `• <@${id}>`).join('\n')
          : 'No admins configured (all users have admin privileges)';

      await respond({
        text: `*Current Admins:*\n${adminList}`,
        response_type: 'ephemeral',
      });
      return;
    }

    // Check if we have a user to add/remove
    if (parts.length < 2) {
      await respond({
        text: 'Please specify a user to add or remove. Example: `/manageadmins add @user`',
        response_type: 'ephemeral',
      });
      return;
    }

    // Extract user ID from mention
    let targetUserId = parts[1];

    // Handle Slack mention format <@USER_ID>
    if (targetUserId.startsWith('<@') && targetUserId.endsWith('>')) {
      targetUserId = targetUserId.substring(2, targetUserId.length - 1);

      // Handle the case where there might be a | character in the mention
      const pipeIndex = targetUserId.indexOf('|');
      if (pipeIndex !== -1) {
        targetUserId = targetUserId.substring(0, pipeIndex);
      }
    }

    // Handle @ prefix without brackets
    if (targetUserId.startsWith('@')) {
      targetUserId = targetUserId.substring(1);

      try {
        const result = await client.users.lookupByEmail({
          email: `${targetUserId}@example.com`, // This is a placeholder
        });

        if (result.user?.id) {
          targetUserId = result.user.id;
        }
      } catch (error) {
        logger.warn(`Could not look up user ID for ${targetUserId}`);
      }
    }

    // Perform the action
    if (action === 'add') {
      const result = await addAdmin(targetUserId);

      if (result) {
        await respond({
          text: `<@${targetUserId}> has been added as an admin.`,
          response_type: 'ephemeral',
        });
        logger.info(`Admin ${command.user_name} (${command.user_id}) added user ${targetUserId} as admin`);
      } else {
        await respond({
          text: `Failed to add <@${targetUserId}> as an admin. Please try again.`,
          response_type: 'ephemeral',
        });
      }
    } else if (action === 'remove') {
      // Prevent removing yourself as admin
      if (targetUserId === command.user_id) {
        await respond({
          text: 'You cannot remove yourself as an admin.',
          response_type: 'ephemeral',
        });
        return;
      }

      const result = await removeAdmin(targetUserId);

      if (result) {
        await respond({
          text: `<@${targetUserId}> has been removed as an admin.`,
          response_type: 'ephemeral',
        });
        logger.info(`Admin ${command.user_name} (${command.user_id}) removed user ${targetUserId} as admin`);
      } else {
        await respond({
          text: `Failed to remove <@${targetUserId}> as an admin. Please try again.`,
          response_type: 'ephemeral',
        });
      }
    } else {
      await respond({
        text: `Unknown action '${action}'. Use 'add', 'remove', or 'list'.`,
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    logger.error('Error in manageAdmins command:', error);
    await respond({
      text: `Sorry, there was an error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
};

module.exports = {
  manageAdminsCommandCallback,
};
