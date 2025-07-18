const fetch = require('node-fetch');

async function testTemplatesAPI() {
  try {
    console.log('🧪 Testing Data Quality Templates API...');
    
    const response = await fetch('http://localhost:3000/api/data-quality-templates');
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ API is working correctly');
      console.log(`📋 Found ${data.data?.templates?.length || 0} templates`);
    } else {
      console.log('❌ API returned error:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to test API:', error.message);
  }
}

testTemplatesAPI();