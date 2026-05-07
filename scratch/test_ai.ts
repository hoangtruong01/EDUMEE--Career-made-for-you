
import { AIService } from './be/src/common/services/ai.service';
import { ConfigService } from '@nestjs/config';

async function test() {
  const config = new ConfigService({
    GEMINI_API_KEY: 'YOUR_KEY_HERE' // I'll use the one from the environment if available
  });
  const ai = new AIService(config);
  try {
    const data = await ai.generateFullCareerData('Cloud Architect');
    console.log('AI Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
// This is just a draft, I can't run it easily without full Nest context.
