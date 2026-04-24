const { MongoClient } = require('mongodb');

async function fixFreePlan() {
  const uri = "mongodb+srv://aiedumee_db_user:cfbeOnkBDd3Xv89W@edumee.ajuue76.mongodb.net/?appName=Edumee";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    const plans = db.collection('ai_plans');

    // Show current state
    const current = await plans.findOne({ name: 'Free' });
    console.log('Current Free plan:', JSON.stringify(current, null, 2));

    // Enable all features for Free plan + high limits for dev
    const result = await plans.updateOne(
      { name: 'Free' },
      {
        $set: {
          'limits.assessmentsPerMonth': 100,
          'limits.careerRecommendationRunsPerMonth': 100,
          'limits.chatMessagesPerMonth': 100,
          'limits.maxCareerRecommendationsPerRun': 5,
          'features.careerRecommendation': true,
          'features.aiChatbot': true,
          'features.careerComparison': true,
          'features.personalizedRoadmap': true,
        }
      }
    );
    console.log(`Updated Free plan: ${result.modifiedCount} doc modified`);
    
    const updated = await plans.findOne({ name: 'Free' });
    console.log('Updated Free plan:', JSON.stringify(updated?.limits, null, 2), JSON.stringify(updated?.features, null, 2));
  } finally {
    await client.close();
  }
}

fixFreePlan().catch(console.error);
