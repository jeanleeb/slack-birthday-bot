// Test script for Slack verification challenge
// This script simulates a verification request from Slack to test our handling

const http = require('node.http');

// Define the test challenge value
const challenge = `test_challenge_value_${Math.floor(Math.random() * 1000)}`;

// Create options for the HTTP request
const options = {
  hostname: 'localhost',
  port: 3001, // Make sure this matches your app's port
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

console.log(`Sending verification challenge: '${challenge}'`);

// Send the request
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);

  let responseData = '';

  // Collect response data
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  // Process the response
  res.on('end', () => {
    try {
      const jsonResponse = JSON.parse(responseData);
      console.log('Response received:', jsonResponse);

      // Check if the challenge was echoed back correctly
      if (jsonResponse.challenge === challenge) {
        console.log('✅ TEST PASSED: Challenge was correctly echoed back!');
      } else {
        console.log('❌ TEST FAILED: Challenge did not match!');
        console.log(`Expected: ${challenge}`);
        console.log(`Received: ${jsonResponse.challenge}`);
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', responseData);
    }
  });
});

// Handle request errors
req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.error('Could not connect to the server. Make sure your app is running on port 3001.');
    console.error('Try running: node app.js with SLACK_REQUEST_URL and PORT=3001 environment variables set.');
  }
});

// Send the request data
req.write(data);
req.end();
