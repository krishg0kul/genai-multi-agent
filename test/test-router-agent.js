// test-router-agent.js
const fetch = require('node-fetch');

async function testRouterAgent() {
  console.log('Testing router agent decision making...');
  
  const testUserId = 'router-test-user-' + Date.now();
  console.log(`Using test user ID: ${testUserId}`);
  
  const apiUrl = 'http://localhost:8080/chat';
  
  // Test case 1: Query that should only involve HR
  console.log('\n1. Testing query that should only involve HR...');
  const hrQuery = 'What are the company policies for parental leave?';
  
  const hrResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: hrQuery,
      userId: testUserId
    }),
  });
  
  const hrResult = await hrResponse.json();
  console.log('Agents used:', hrResult.agents);
  console.log('Reasoning:', hrResult.reasoning);
  
  // Test case 2: Query that should involve multiple agents
  console.log('\n2. Testing query that should involve multiple agents...');
  const multiQuery = 'What are the tax implications of our company\'s work-from-home policy?';
  
  const multiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: multiQuery,
      userId: testUserId
    }),
  });
  
  const multiResult = await multiResponse.json();
  console.log('Agents used:', multiResult.agents);
  console.log('Reasoning:', multiResult.reasoning);
  
  // Test case 3: Query that should involve IT
  console.log('\n3. Testing query that should involve IT...');
  const itQuery = 'How do I reset my password?';
  
  const itResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: itQuery,
      userId: testUserId
    }),
  });
  
  const itResult = await itResponse.json();
  console.log('Agents used:', itResult.agents);
  console.log('Reasoning:', itResult.reasoning);
  
  console.log('\nRouter agent test completed!');
}

testRouterAgent().catch(console.error);
