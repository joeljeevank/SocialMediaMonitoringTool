import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import axios from 'axios';

async function testHttpEndpoints() {
  console.log('--- Starting NestJS Application for E2E HTTP Verification ---');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors();
  const testPort = 3099;
  await app.listen(testPort);
  console.log(`Test server listening on http://localhost:${testPort}`);

  const baseUrl = `http://localhost:${testPort}/api/analytics-ai`;

  try {
    // 1. Health Endpoint
    console.log('\nTesting GET /api/analytics-ai/health...');
    const health = await axios.get(`${baseUrl}/health`);
    console.log('Health Response Status:', health.status);
    console.log('Health Payload:', health.data);

    // 2. Examples Endpoint
    console.log('\nTesting GET /api/analytics-ai/examples...');
    const examples = await axios.get(`${baseUrl}/examples`);
    console.log('Examples Categories Count:', examples.data.categories?.length);

    // 3. Ask Post Ranking
    console.log('\nTesting POST /api/analytics-ai/ask (Top 5 LinkedIn posts)...');
    const postRes = await axios.post(`${baseUrl}/ask`, {
      question: 'Show my top five LinkedIn posts by engagement',
    });
    console.log('Status:', postRes.status);
    console.log('Answer snippet:', postRes.data.answer?.slice(0, 150));
    console.log('Metric Cards:', postRes.data.metricCards);
    console.log('Table Rows Count:', postRes.data.table?.rows?.length);

    // 4. Ask YouTube Comparison
    console.log('\nTesting POST /api/analytics-ai/ask (Compare this month with last month)...');
    const compRes = await axios.post(`${baseUrl}/ask`, {
      question: 'Compare this month with last month',
    });
    console.log('Status:', compRes.status);
    console.log('Comparisons Count:', compRes.data.comparisons?.length);
    console.log('Comparisons Sample:', compRes.data.comparisons?.[0]);

    // 5. Ask YouTube Videos Ranking
    console.log('\nTesting POST /api/analytics-ai/ask (Which YouTube videos received the most views?)...');
    const vidRes = await axios.post(`${baseUrl}/ask`, {
      question: 'Which YouTube videos received the most views?',
    });
    console.log('Status:', vidRes.status);
    console.log('Top Video in Table:', vidRes.data.table?.rows?.[0]?.[1]);

    // 6. Ask Analytical Observations
    console.log('\nTesting POST /api/analytics-ai/ask (Give me three data-backed observations)...');
    const obsRes = await axios.post(`${baseUrl}/ask`, {
      question: 'Give me three data-backed observations from my current analytics',
    });
    console.log('Status:', obsRes.status);
    console.log('Observations snippet:', obsRes.data.answer?.slice(0, 200));

    // 7. GET /api/analytics-ai/entities
    console.log('\nTesting GET /api/analytics-ai/entities...');
    const entRes = await axios.get(`${baseUrl}/entities`);
    console.log('Status:', entRes.status);
    console.log(`Connected Entities: ${entRes.data.channels?.length} channels, ${entRes.data.accounts?.length} accounts.`);

    // 8. Targeted Channel Question ("How is Bryan Daniel performing?")
    console.log('\nTesting POST /api/analytics-ai/ask (Targeted question: How is Bryan Daniel performing?)...');
    const bryanRes = await axios.post(`${baseUrl}/ask`, {
      question: 'How is Bryan Daniel performing?',
    });
    console.log('Status:', bryanRes.status);
    console.log('Target Resolved:', bryanRes.data.interpretation?.targetIdentifier);
    console.log('Metric Cards:', bryanRes.data.metricCards?.map((c: any) => `${c.title}: ${c.value}`).join(' | '));

    // 9. Scoped Channel Question with channelFilter
    console.log('\nTesting POST /api/analytics-ai/ask with channelFilter="Bryan Daniel"...');
    const filterRes = await axios.post(`${baseUrl}/ask`, {
      question: 'Show performance metrics',
      channelFilter: 'Bryan Daniel',
    });
    console.log('Status:', filterRes.status);
    console.log('Target Resolved:', filterRes.data.interpretation?.targetIdentifier);

    console.log('\n🎉 ALL E2E HTTP ENDPOINTS VERIFIED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('E2E Verification Error:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

testHttpEndpoints().catch((e) => {
  console.error(e);
  process.exit(1);
});

