# Taq Birthday Bot

A Slack bot that tracks birthdays of workspace members and sends automatic birthday messages.

## Features

- 🎂 Save birthdays for all workspace members
- 👥 Tag members with proper @mentions in birthday messages
- 📅 Automatically send birthday messages to a channel of choice
- 📋 List all saved birthdays
- 🔜 See upcoming birthdays
- 🔄 Update or remove birthdays

## Slack Commands

| Command             | Description                                          | Example                         |
|---------------------|------------------------------------------------------|----------------------------------|
| `/setbirthday`      | Set your birthday date                               | `/setbirthday 25/12`             |
| `/birthdaychannel`  | Set the channel for birthday announcements           | `/birthdaychannel`               |
| `/listbirthdays`    | Show a list of all saved birthdays                   | `/listbirthdays`                 |
| `/nextbirthdays`    | Show the next 5 upcoming birthdays                   | `/nextbirthdays`                 |
| `/removebirthday`   | Remove your birthday from the system                 | `/removebirthday`                |

### Admin Commands

| Command                 | Description                                     | Example                                    |
|-------------------------|-------------------------------------------------|--------------------------------------------|
| `/adminsetbirthday`     | Set a birthday for another user                 | `/adminsetbirthday @user 25/12 John Doe`   |
| `/adminlistbirthdays`   | Get detailed list of all birthdays              | `/adminlistbirthdays`                      |
| `/adminremovebirthday`  | Remove a birthday for another user              | `/adminremovebirthday @user`               |
| `/adminbulkremove`     | Remove birthdays for multiple users at once      | `/adminbulkremove`                       |
| `/adminimportbirthdays` | Import multiple birthdays from CSV              | `/adminimportbirthdays`                    |
| `/manageadmins`         | Manage who has admin privileges                 | `/manageadmins add @user`                  |
| `/validatecsv`          | Validate CSV data before importing              | `/validatecsv`                             |
| `/csvtemplate`          | Get a CSV template for importing birthdays      | `/csvtemplate`                             |

### Debug Commands

| Command                | Description                                          | Example                     |
|------------------------|------------------------------------------------------|----------------------------|
| `/debugcheckbirthdays` | Manually trigger the birthday check                  | `/debugcheckbirthdays`      |
| `/debugsettoday`       | Set your birthday to today's date for testing        | `/debugsettoday`            |

Before getting started, make sure you have a development workspace where you have permissions to install apps. If you don’t have one setup, go ahead and [create one](https://slack.com/create).

### Developer Program
Join the [Slack Developer Program](https://api.slack.com/developer-program) for exclusive access to sandbox environments for building and testing your apps, tooling, and resources created to help you build and grow.

## Setup Instructions

1. Create a new Slack app in the [Slack API Console](https://api.slack.com/apps)
2. Add the following Bot Token Scopes:
   - `channels:read`
   - `chat:write`
   - `commands`
   - `users:read`
3. Create the slash commands in the Slack API Console
4. Install the app to your workspace
5. Set the following environment variables:
   ```
   # For Socket Mode (recommended for development)
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_APP_TOKEN=xapp-your-app-token
   
   # For HTTP Mode (traditional deployment with public URL)
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_REQUEST_URL=https://your-domain.com/slack/events
   PORT=3000
   ```
6. Run the app:
   ```
   npm install
   npm start
   ```

## Deployment Options

The bot now supports two deployment methods:

1. **Socket Mode (Default)**: Uses WebSocket connections, no public URL needed
2. **HTTP Mode**: Traditional method requiring a public URL

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on both deployment methods.

## How It Works

The bot uses a SQLite database to store birthdays and configuration. Every day at 9:00 AM, it checks if any users have a birthday on that day and sends a celebratory message to the configured channel.

### Date Handling

The bot uses a timezone-aware approach to handle dates properly:
- Birthdays are stored in a consistent YYYY-MM-DD format
- Date processing avoids timezone conversion issues
- The scheduler correctly matches stored dates regardless of server timezone

### Admin Permissions

To restrict who can use admin commands:

1. Edit the `utils/permissions.js` file
2. Add Slack user IDs to the `ADMIN_USER_IDS` array:
   ```javascript
   const ADMIN_USER_IDS = [
     'U12345678', // Replace with actual user IDs
     'U87654321',
   ];
   ```
3. Only users with IDs in this list will be able to use admin commands

The code in this project uses the Bolt for JavaScript framework to create a Slack app. For more information about Bolt for JavaScript, see [bolt js](https://api.slack.com/start/bolt/node-js).

## Documentation

The following documentation files provide details about recent changes and improvements:

- [APP-RENAME.md](APP-RENAME.md) - Details about the app rename from "slack-birthday-bot" to "Taq Birthday Bot"
- [DISPLAY-NAME-REMOVAL.md](DISPLAY-NAME-REMOVAL.md) - Information about the removal of display name functionality
- [TIMEZONE-FIX.md](TIMEZONE-FIX.md) - Documentation of timezone issues fix and date format standardization
- [CHANNEL-IMPROVEMENTS.md](CHANNEL-IMPROVEMENTS.md) - Details about improvements to channel selection
- [MESSAGE-FORMAT-CHANGE.md](MESSAGE-FORMAT-CHANGE.md) - Information about message format changes
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide for deploying the bot using Socket Mode or HTTP mode
- [HTTP-VERIFICATION.md](HTTP-VERIFICATION.md) - Details about HTTP mode verification challenge implementation
- [VERIFICATION-TESTING.md](VERIFICATION-TESTING.md) - Guide for testing the verification challenge implementation
- [HTTP-MODE-SETUP.md](HTTP-MODE-SETUP.md) - Step-by-step guide for setting up HTTP mode
- [HTTP-MODE-TECHNICAL.md](HTTP-MODE-TECHNICAL.md) - Technical details of the HTTP mode implementation
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - General implementation details and commands
