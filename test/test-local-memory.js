// test-local-memory.js
const memoryService = require('../src/services/memory.service');
const fs = require('fs');
const path = require('path');

async function testLocalMemory() {
  console.log('Testing local memory service...');
  
  const testUserId = 'test-user-' + Date.now();
  console.log(`Using test user ID: ${testUserId}`);
  
  // Test adding messages to memory
  console.log('\n1. Testing addToMemory...');
  const userMessage = 'What are the employee benefits?';
  const assistantResponse = 'Employee benefits include health insurance, 401k, and paid time off.';
  
  const messages = memoryService.formatMessages(userMessage, assistantResponse);
  const addResult = await memoryService.addToMemory(messages, testUserId);
  
  console.log(`Add result: ${addResult ? 'Success' : 'Failed'}`);
  
  // Test retrieving memory
  console.log('\n2. Testing searchMemory with isHistoryQuery=true...');
  const searchResults = await memoryService.searchMemory('', testUserId, true);
  
  console.log(`Retrieved ${searchResults.length} messages`);
  console.log('First message:', searchResults[0]);
  
  // Test adding more messages
  console.log('\n3. Testing adding more messages...');
  const userMessage2 = 'What about vacation days?';
  const assistantResponse2 = 'Employees get 15 vacation days per year.';
  
  const messages2 = memoryService.formatMessages(userMessage2, assistantResponse2);
  const addResult2 = await memoryService.addToMemory(messages2, testUserId);
  
  console.log(`Add result: ${addResult2 ? 'Success' : 'Failed'}`);
  
  // Test retrieving all memory
  console.log('\n4. Testing getAllMemory...');
  const allMemory = await memoryService.getAllMemory(testUserId);
  
  console.log(`Retrieved ${allMemory.length} total messages`);
  console.log('Messages:', allMemory);
  
  // Verify the memory file exists
  const memoryFilePath = path.join(__dirname, '../memory/local', `${testUserId}.json`);
  console.log('\n5. Verifying memory file exists...');
  console.log(`Memory file path: ${memoryFilePath}`);
  console.log(`File exists: ${fs.existsSync(memoryFilePath)}`);
  
  if (fs.existsSync(memoryFilePath)) {
    const fileContent = fs.readFileSync(memoryFilePath, 'utf8');
    console.log('File content:', fileContent);
  }
  
  // Test clearing memory
  console.log('\n6. Testing clearMemory...');
  const clearResult = await memoryService.clearMemory(testUserId);
  
  console.log(`Clear result: ${clearResult ? 'Success' : 'Failed'}`);
  console.log(`File exists after clearing: ${fs.existsSync(memoryFilePath)}`);
  
  console.log('\nLocal memory service test completed!');
}

testLocalMemory().catch(console.error);
