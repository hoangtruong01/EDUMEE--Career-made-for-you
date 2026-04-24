const axios = require('axios');

async function run() {
  const email = 'test-e2e-' + Date.now() + '@edumee.com';
  console.log('Registering user...');
  await axios.post('http://localhost:3001/api/v1/auth/register', {email, password: 'Password123!', confirmPassword: 'Password123!', name: 'Test User', gender: 'male', date_of_birth: '2000-01-01T00:00:00.000Z'});
  
  const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {email, password: 'Password123!'});
  const token = loginRes.data.data.result.access_token;
  
  console.log('Fetching questions...');
  const questionsRes = await axios.get('http://localhost:3001/api/v1/assessment-questions?page=1&limit=100', {headers: {Authorization: 'Bearer ' + token}});
  const questions = questionsRes.data.data.data;
  console.log(`Fetched ${questions.length} questions`);

  console.log('Creating session...');
  const sessionRes = await axios.post('http://localhost:3001/api/v1/assessment-sessions', {}, {headers: {Authorization: 'Bearer ' + token}});
  const sessionId = sessionRes.data.data.id;
  console.log('Session ID:', sessionId);

  const payload = questions.map(q => ({
    sessionId,
    questionId: q.id,
    answer: 'A' // Mocking answer A for all
  }));

  console.log('Submitting answers...');
  await axios.post('http://localhost:3001/api/v1/assessment-answers/bulk', payload, {headers: {Authorization: 'Bearer ' + token}});
  
  console.log('Finishing session...');
  await axios.post(`http://localhost:3001/api/v1/assessment-sessions/${sessionId}/finish`, {}, {headers: {Authorization: 'Bearer ' + token}});

  console.log('Generating AI analysis... This may take a while.');
  try {
    const aiRes = await axios.post('http://localhost:3001/api/v1/career-fit-results/generate-my-analysis', {}, {headers: {Authorization: 'Bearer ' + token}, timeout: 60000});
    console.log('AI Analysis generated:', aiRes.data.data.length, 'recommendations');
  } catch (error) {
    console.error('AI generation failed:', error.response?.data || error.message);
  }

}

run().catch(console.error);
