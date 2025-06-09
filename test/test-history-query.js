// test-history-query.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testHistoryQuery() {
  console.log('Testing history query handling...');
  
  const testUserId = 'history-test-user-' + Date.now();
  console.log(`Using test user ID: ${testUserId}`);
  
  const apiUrl = 'http://localhost:8080/chat';
  
  // First message
  console.log('\n1. Sending first message...');
  const firstMessage = 'What are the IT password requirements?';
  
  const firstResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: firstMessage,
      userId: testUserId
    }),
  });
  
  const firstResult = await firstResponse.json();
  console.log('Response:', firstResult.responseSummary);
  
  // Check if memory file was created
  const memoryFilePath = path.join(__dirname, '../memory/local', `${testUserId}.json`);
  console.log('\n2. Checking if memory file was created...');
  console.log(`Memory file path: ${memoryFilePath}`);
  console.log(`File exists: ${fs.existsSync(memoryFilePath)}`);
  
  // History query
  console.log('\n3. Sending history query...');
  const historyQuery = 'what is my last question?';
  
  const historyResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: historyQuery,
      userId: testUserId
    }),
  });
  
  const historyResult = await historyResponse.json();
  console.log('Response:', historyResult.responseSummary);
  console.log('Agents used:', historyResult.agents);
  console.log('Reasoning:', historyResult.reasoning);
  
  console.log('\nHistory query test completed!');
}

testHistoryQuery().catch(console.error);
