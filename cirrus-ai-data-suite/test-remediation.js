// Test script for remediation service
const { RemediationJobService } = require('./src/services/remediationJobService.ts');

async function testRemediationService() {
  try {
    console.log('Testing RemediationJobService...');
    
    const service = new RemediationJobService();
    const result = await service.getJobs({});
    
    console.log('Success! Jobs result:', result);
  } catch (error) {
    console.error('Error testing service:', error);
    console.error('Stack trace:', error.stack);
  }
}

testRemediationService();