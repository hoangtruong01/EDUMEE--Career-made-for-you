const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

async function run() {
  const uri = 'mongodb+srv://aiedumee_db_user:cfbeOnkBDd3Xv89W@edumee.ajuue76.mongodb.net/?appName=Edumee';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const questions = await db.collection('assessment_questions').find({}).toArray();
  
  const answers = questions.map(q => ({
    questionText: q.questionText,
    dimension: q.dimension,
    answer: 'A',
    options: q.options
  }));

  const answersText = answers.map(a => {
      const optionsDesc = a.options && a.options.length > 0 
        ? '\nOptions:\n' + a.options.map(o => '  ' + o.value + ': ' + o.label).join('\n')
        : '';
      return 'Question: ' + a.questionText + optionsDesc + '\nDimension: ' + a.dimension + '\nUser\'s Answer: ' + JSON.stringify(a.answer);
  }).join('\n\n');

  const prompt = `
You are an expert career counselor and psychologist. Analyze the following personality assessment results and provide career recommendations.

ASSESSMENT ANSWERS (RIASEC format, score 1-5 where 1=Strongly Disagree, 5=Strongly Agree):
${answersText}

AVAILABLE CAREERS:
Please suggest suitable careers based on personality analysis.

Please provide a comprehensive analysis in the following JSON format:
{
  "personalityAnalysis": {
    "bigFiveScores": {
      "openness": <0-100>,
      "conscientiousness": <0-100>,
      "extraversion": <0-100>,
      "agreeableness": <0-100>,
      "neuroticism": <0-100>
    },
    "riasecScores": {
      "realistic": <0-100>,
      "investigative": <0-100>,
      "artistic": <0-100>,
      "social": <0-100>,
      "enterprising": <0-100>,
      "conventional": <0-100>
    },
    "personalityProfile": {
      "dominantTraits": ["trait1", "trait2"],
      "strengthAreas": ["strength1", "strength2"],
      "developmentAreas": ["area1", "area2"],
      "workStyle": "mô tả phong cách làm việc ưa thích",
      "communication": "mô tả sở thích giao tiếp", 
      "leadership": "mô tả phong cách lãnh đạo"
    }
  },
  "careerRecommendations": [
    {
      "careerId": "unique_id_or_null",
      "careerTitle": "Tên nghề nghiệp",
      "fitScore": <0-100>,
      "personalityMatch": {
        "bigFiveAlignment": <0-100>,
        "riasecAlignment": <0-100>,
        "overallFit": <0-100>
      },
      "reasons": ["lý do 1", "lý do 2"],
      "potentialChallenges": ["thách thức 1", "thách thức 2"],
      "developmentSuggestions": ["gợi ý phát triển 1", "gợi ý phát triển 2"]
    }
  ],
  "explanation": "Giải thích tổng quát về kết quả phân tích và lời khuyên nghề nghiệp",
  "confidence": <0-100>
}

Requirements:
1. Analyze personality dimensions based on assessment answers (Scale 1-5).
2. Calculate realistic scores (0-100) for Big Five and RIASEC. For RIASEC, map each dimension from its corresponding answer.
3. Recommend 3-5 most suitable careers.
4. Provide specific, actionable insights.
5. Be accurate and evidence-based.
6. Return valid JSON only (no additional text, no markdown code blocks).
7. ALL text content (traits, strengths, reasons, suggestions, explanations, etc.) MUST be written in Vietnamese language.
`;

  console.log('Calling Gemini...');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + process.env.GEMINI_API_KEY;
  try {
    const res = await axios.post(url, {
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    console.log(res.data.candidates[0].content.parts[0].text);
  } catch(e) {
    console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
  await client.close();
}
run();
