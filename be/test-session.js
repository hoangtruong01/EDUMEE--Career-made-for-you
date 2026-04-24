const axios = require('axios');

async function testSessionCreation() {
  const baseUrl = 'http://localhost:3001/api/v1';
  
  try {
    // 1. Register a test user
    const email = `test-${Date.now()}@edumee.com`;
    console.log(`Registering ${email}...`);
    await axios.post(`${baseUrl}/auth/register`, {
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      name: 'Test User',
      gender: 'male',
      date_of_birth: '2000-01-01T00:00:00.000Z'
    });

    // 2. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email,
      password: 'Password123!'
    });
    
    const token = loginRes.data.data.result.access_token;
    console.log('Token extracted:', token.substring(0, 20) + '...');

    // 3. Create Session
    console.log('Creating session...');
    const sessionRes = await axios.post(`${baseUrl}/assessment-sessions`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Session created successfully:', sessionRes.data);

    // 4. Try creating another session (to test the reuse logic)
    console.log('Creating another session...');
    const sessionRes2 = await axios.post(`${baseUrl}/assessment-sessions`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Second session created successfully:', sessionRes2.data);


  } catch (error) {
    console.error('Error Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2) || error.message);
  }
}

testSessionCreation();
