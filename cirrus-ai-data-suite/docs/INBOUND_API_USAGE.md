# Inbound API Usage Guide

The Inbound API feature allows external systems to push data into Cirrus Data Suite via HTTP endpoints.

## Creating an Inbound API Endpoint

1. Navigate to **Data Sources** → **Inbound API**
2. Click **Create Endpoint**
3. Configure:
   - **Name**: Descriptive name for your endpoint
   - **Description**: Optional description
   - **Data Mode**: 
     - `Append`: Add new data to existing data
     - `Replace`: Overwrite all existing data
   - **Custom URL Path**: Optional friendly URL (e.g., `customer-data`)
   - **API Key Authentication**: Toggle on/off
   - **API Key Header**: Header name for API key (default: `X-API-Key`)

## API Endpoint URLs

### With Custom URL
```
POST https://your-domain.com/api/inbound/{custom-url}
```

### With API Key URL (Legacy)
```
POST https://your-domain.com/api/inbound/{api-key}
```

## Authentication

### API Key in Header (Recommended)
```bash
curl -X POST https://your-domain.com/api/inbound/customer-data \
  -H "Content-Type: application/json" \
  -H "X-API-Key: inbound_xxx" \
  -d '{"data": "value"}'
```

### Bearer Token
```bash
curl -X POST https://your-domain.com/api/inbound/customer-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inbound_xxx" \
  -d '{"data": "value"}'
```

### No Authentication
If API key authentication is disabled, simply omit the authentication header.

## Data Formats

### JSON (Recommended)
```json
{
  "records": [
    {"id": 1, "name": "John", "email": "john@example.com"},
    {"id": 2, "name": "Jane", "email": "jane@example.com"}
  ]
}
```

### Plain Text
```
Content-Type: text/plain

Raw text data...
```

## Response Format

### Success
```json
{
  "success": true,
  "message": "Data received successfully",
  "recordsProcessed": 2
}
```

### Error
```json
{
  "error": "Invalid API key"
}
```

## Data Management

- **Append Mode**: New data is added to existing records
- **Replace Mode**: All existing data is replaced with new data
- **JSON Ready**: JSON data is automatically parsed and available for transformation
- **Data Discovery**: All inbound data appears in the Data Discovery page

## Real-time Updates

The Inbound API page shows real-time updates via Server-Sent Events (SSE):
- Request count updates automatically
- Last request timestamp updates in real-time
- No manual refresh needed

## Best Practices

1. **Use Custom URLs** for human-readable endpoints
2. **Enable API Key Authentication** for production environments
3. **Use JSON format** for structured data
4. **Monitor request counts** to track usage
5. **Set appropriate data mode** based on your use case

## Example Integration

```javascript
// Node.js example
const axios = require('axios');

async function sendData() {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/inbound/customer-data',
      {
        customers: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'inbound_your_api_key_here'
        }
      }
    );
    
    console.log('Data sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending data:', error.response?.data || error.message);
  }
}
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong or missing API key | Check API key and header name |
| "Endpoint not found" | Invalid URL or deleted endpoint | Verify endpoint URL |
| "API endpoint is inactive" | Endpoint disabled | Re-enable in UI |
| 404 Not Found | Wrong URL path | Check custom URL or API key |