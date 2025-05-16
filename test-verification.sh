#!/bin/bash
# Test script for Slack verification challenge

echo "🧪 Testing Slack Verification Challenge Handling"
echo "==============================================="
echo ""
echo "This script will:"
echo "1. Start the Birthday Bot in HTTP mode"
echo "2. Send a mock verification challenge request"
echo "3. Verify the response is correct"
echo ""

# Define variables
PORT=3001
BOT_TOKEN="test_token"
SIGNING_SECRET="test_secret"
REQUEST_URL="http://localhost:$PORT/slack/events"

# Generate a random challenge value
CHALLENGE="test_challenge_$(date +%s)"

echo "Starting Birthday Bot in HTTP mode on port $PORT"
echo "------------------------------------------------"
echo ""

# Start the bot in the background
node -e "
const { App, ExpressReceiver } = require('@slack/bolt');

// Create a custom receiver that only handles verification
const receiver = new ExpressReceiver({ 
  signingSecret: 'test_secret',
  endpoints: '/slack/events',
  processBeforeResponse: true
});

// Add middleware to handle verification challenge
receiver.router.use('/slack/events', (req, res, next) => {
  if (req.body && req.body.type === 'url_verification') {
    console.log('✅ Received verification challenge: ' + req.body.challenge);
    return res.json({ challenge: req.body.challenge });
  }
  next();
});

// Create the app
const app = new App({
  receiver,
  token: 'test_token',
});

// Start the app
(async () => {
  await app.start($PORT);
  console.log('✅ Test server running on port $PORT');
})();
" &

# Get the PID of the background process
SERVER_PID=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 3

echo ""
echo "Sending verification challenge: '$CHALLENGE'"
echo "--------------------------------------------"
echo ""

# Send the challenge request
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"type\":\"url_verification\",\"challenge\":\"$CHALLENGE\"}" $REQUEST_URL)

echo "Response received: $RESPONSE"
echo ""

# Check if the response contains the challenge
if echo $RESPONSE | grep -q "$CHALLENGE"; then
  echo "✅ SUCCESS: Server correctly echoed back the challenge!"
else
  echo "❌ FAILURE: Server did not echo back the challenge correctly."
  echo "Expected response to contain: $CHALLENGE"
  echo "Actual response: $RESPONSE"
fi

# Clean up
echo ""
echo "Stopping test server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "Test completed."
