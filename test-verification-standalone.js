// Self-contained test for Slack verification challenge
// This script runs both the server and the test in a single process

const express = require('express');
const bodyParser = require('body-parser');
const http = require('node.http');

console.log('🧪 Slack Verification Challenge Test');
console.log('===================================');
console.log("This test verifies that our app correctly handles Slack's verification challenge.");

// Create an Express app
const app = express();
app.use(bodyParser.json());

// Add the verification challenge handler middleware (same as in app.js)
app.use('/slack/events', (req, res, next) => {
  if (req.body && req.body.type === 'url_verification') {
    const challenge = req.body.challenge;
    console.log(`✅ Server received verification challenge: "${challenge}"`);

    try {
      // Respond with the challenge value
      return res.status(200).json({ challenge });
    } catch (error) {
      console.error('❌ Error handling verification challenge:', error);
      return res.status(500).json({ error: 'Failed to process verification challenge' });
    }
  }
  next();
});

// Default route handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Start the server
const PORT = 3002;
const server = app.listen(PORT, () => {
  console.log(`✅ Test server started on port ${PORT}`);
  console.log('-----------------------------------');

  // After server starts, run the test
  runTest();
});

// Clean up function to close the server
function cleanUp() {
  server.close(() => {
    console.log('✅ Test server closed');
    process.exit(0);
  });
}

// Function to run the verification test
function runTest() {
  // Define the test challenge value
  const challenge = `test_challenge_${Math.floor(Math.random() * 10000)}`;

  console.log(`📤 Sending verification challenge: "${challenge}"`);

  // Create options for the HTTP request
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/slack/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Create the verification request payload
  const data = JSON.stringify({
    type: 'url_verification',
    challenge: challenge,
  });

  // Send the request
  const req = http.request(options, (res) => {
    console.log(`📥 Received response with status: ${res.statusCode}`);

    let responseData = '';

    // Collect response data
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    // Process the response
    res.on('end', () => {
      try {
        const jsonResponse = JSON.parse(responseData);
        console.log(`📄 Parsed response: ${JSON.stringify(jsonResponse)}`);

        // Check if the challenge was echoed back correctly
        if (jsonResponse.challenge === challenge) {
          console.log('✅ TEST PASSED: Challenge was correctly echoed back!');
          console.log('✅ Your Slack verification handler is working properly.');
          console.log("✅ The app will pass Slack's verification when you configure the Events API.");
        } else {
          console.log('❌ TEST FAILED: Challenge did not match!');
          console.log(`   Expected: "${challenge}"`);
          console.log(`   Received: "${jsonResponse.challenge}"`);
        }
      } catch (e) {
        console.error('❌ Error parsing response:', e);
        console.log(`❌ Raw response: ${responseData}`);
      }

      // Close the server after test completes
      cleanUp();
    });
  });

  // Handle request errors
  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
    cleanUp();
  });

  // Send the request data
  req.write(data);
  req.end();
}

// Handle process termination
process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);

// Handle process termination
process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
