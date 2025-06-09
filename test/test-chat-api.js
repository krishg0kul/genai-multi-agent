// test-chat-api.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testChatAPI() {
  console.log('Testing chat API with local memory...');
  
  const testUserId = 'api-test-user-' + Date.now();
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
  
  if (fs.existsSync(memoryFilePath)) {
    const fileContent = fs.readFileSync(memoryFilePath, 'utf8');
    const memory = JSON.parse(fileContent);
    console.log(`Memory contains ${memory.length} messages`);
    console.log('First user message:', memory[0]);
    console.log('First assistant response:', memory[1]);
  }
  
  // Second message (followup)
  console.log('\n3. Sending followup message...');
  const secondMessage = 'How often do I need to change my password?';
  
  const secondResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: secondMessage,
      userId: testUserId
    }),
  });
  
  const secondResult = await secondResponse.json();
  console.log('Response:', secondResult.responseSummary);
  
  // Check memory file again
  console.log('\n4. Checking memory file after second message...');
  if (fs.existsSync(memoryFilePath)) {
    const fileContent = fs.readFileSync(memoryFilePath, 'utf8');
    const memory = JSON.parse(fileContent);
    console.log(`Memory now contains ${memory.length} messages`);
    console.log('Latest user message:', memory[memory.length - 2]);
    console.log('Latest assistant response:', memory[memory.length - 1]);
  }
  
  console.log('\nChat API test completed!');
}

testChatAPI().catch(console.error);
