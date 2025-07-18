// Simple test script to verify upload session persistence
const crypto = require('crypto');

async function testUploadSession() {
  console.log('Testing upload session functionality...\n');

  // 1. Initialize upload
  console.log('1. Initializing upload session...');
  const initResponse = await fetch('http://localhost:3000/api/streaming/upload/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test-file.txt',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'text/plain',
      metadata: { test: true }
    })
  });

  if (!initResponse.ok) {
    console.error('Failed to initialize:', await initResponse.text());
    return;
  }

  const initData = await initResponse.json();
  console.log('Initialized:', initData);

  // 2. Check status
  console.log('\n2. Checking upload status...');
  const statusResponse = await fetch(`http://localhost:3000/api/streaming/upload/status?uploadId=${initData.uploadId}`);
  
  if (!statusResponse.ok) {
    console.error('Failed to get status:', await statusResponse.text());
    return;
  }

  const statusData = await statusResponse.json();
  console.log('Status:', statusData);

  // 3. Upload a chunk
  console.log('\n3. Uploading a test chunk...');
  const chunkData = Buffer.from('This is test chunk data');
  const checksum = crypto.createHash('sha256').update(chunkData).digest('hex');
  
  const formData = new FormData();
  formData.append('uploadId', initData.uploadId);
  formData.append('chunkIndex', '0');
  formData.append('checksum', checksum);
  formData.append('chunk', new Blob([chunkData]));

  const chunkResponse = await fetch('http://localhost:3000/api/streaming/upload/chunk', {
    method: 'POST',
    body: formData
  });

  if (!chunkResponse.ok) {
    console.error('Failed to upload chunk:', await chunkResponse.text());
    return;
  }

  const chunkResult = await chunkResponse.json();
  console.log('Chunk upload result:', chunkResult);

  console.log('\nTest completed successfully!');
}

// Run the test
testUploadSession().catch(console.error);