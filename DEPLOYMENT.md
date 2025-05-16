# Deployment Guide for Taq Birthday Bot

This guide explains how to deploy Taq Birthday Bot using either Socket Mode or HTTP mode.

## Socket Mode Deployment (Recommended for Free Hosting)

Socket Mode creates a WebSocket connection between your app and Slack's servers, so you don't need to expose any public URLs. This is ideal for hosting on free platforms or development.

### Requirements for Socket Mode:
1. **Bot Token (`SLACK_BOT_TOKEN`)**: Starts with `xoxb-`
2. **App-Level Token (`SLACK_APP_TOKEN`)**: Starts with `xapp-` with the `connections:write` scope

### Steps:
1. In the Slack API dashboard, enable Socket Mode for your app
2. Generate an App-Level Token with the `connections:write` scope
3. In your `.env` file, set:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_APP_TOKEN=xapp-your-token
   SLACK_REQUEST_URL=
   ```
4. Deploy your app on any platform (including free tiers)

## HTTP Mode Deployment

HTTP mode requires your app to be accessible via a public URL. This is the traditional way of deploying Slack apps.

### Requirements for HTTP Mode:
1. **Bot Token (`SLACK_BOT_TOKEN`)**: Starts with `xoxb-`
2. **Signing Secret (`SLACK_SIGNING_SECRET`)**: Found in the "Basic Information" section of your Slack app
3. **Public URL**: Your app must be accessible via a public URL

### Steps:
1. In the Slack API dashboard, disable Socket Mode for your app
2. Configure these URLs in your Slack app settings:
   - **Interactivity Request URL**: `https://your-domain.com/slack/events`
   - **Event Subscriptions Request URL**: `https://your-domain.com/slack/events`
   - **Slash Commands URL**: `https://your-domain.com/slack/events`
3. In your `.env` file, set:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_REQUEST_URL=https://your-domain.com/slack/events
   PORT=3000  # Or any port you want to use
   ```
4. Deploy your app on a platform that gives you a public URL

## Switching Between Modes

The app is now configured to automatically detect which mode to use:

- If `SLACK_REQUEST_URL` is empty, it will use Socket Mode
- If `SLACK_REQUEST_URL` is set, it will use HTTP mode

## Free Hosting Options

### For Socket Mode (Recommended):
- **Render.com** (Free Tier)
- **Railway.app** (Limited Free Tier)
- **Your own computer with PM2**

### For HTTP Mode:
- **Render.com** (Free Tier) - Gives you a public URL
- **Railway.app** (Limited Free Tier) - Gives you a public URL
- **Replit.com** (Free Tier) - Gives you a public URL

## Environment Variables Summary

| Variable | Socket Mode | HTTP Mode | Description |
|----------|------------|-----------|-------------|
| `SLACK_BOT_TOKEN` | Required | Required | Bot User OAuth Token |
| `SLACK_APP_TOKEN` | Required | Not needed | App-Level Token (for Socket Mode) |
| `SLACK_SIGNING_SECRET` | Not needed | Required | Signing Secret (for HTTP Mode) |
| `SLACK_REQUEST_URL` | Empty/Not set | Required | Public URL for HTTP endpoints |
| `PORT` | Not needed | Required | Port for HTTP server (default: 3000) |
