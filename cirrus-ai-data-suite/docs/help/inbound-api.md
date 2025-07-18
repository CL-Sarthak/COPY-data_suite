# Inbound API Help Guide

## Overview

The Inbound API feature allows external systems to push data directly into Cirrus Data Suite through HTTP endpoints. This is perfect for webhooks, real-time data ingestion, system integrations, and any scenario where external applications need to send data to your data platform.

## Key Features

- **Custom Endpoints**: Create unique URLs for different data sources
- **Flexible Authentication**: Optional API key security with customizable headers
- **Custom URLs**: User-friendly endpoints like `/api/inbound/customer-data`
- **Data Modes**: Append new data or replace existing data
- **Real-time Updates**: Live tracking of requests and data
- **Automatic Processing**: Data is immediately available for discovery and transformation
- **Multiple Formats**: Accept JSON, text, or other content types

## Getting Started

### 1. Navigate to Inbound API

From the main menu:
- Click **Data Sources** → **Inbound API**
- Or use quick navigation: **Data & Discovery** → **File Sources** → **Inbound API**

### 2. Create an Inbound Endpoint

1. Click **Create Endpoint**
2. Configure your endpoint:
   - **Name**: Descriptive name (e.g., "Customer Webhook")
   - **Description**: Optional details about the data source
   - **Data Mode**:
     - **Append**: New data is added to existing records
     - **Replace**: New data replaces all existing data
   - **Custom URL Path**: Optional friendly URL (e.g., `customer-webhook`)
   - **Require API Key**: Toggle authentication on/off
   - **API Key Header**: Header name for authentication (default: `X-API-Key`)

3. Click **Create Endpoint**

### 3. Get Your Endpoint Details

After creation, you'll see:
- **Endpoint URL**: The URL to send data to
- **API Key**: Unique key for authentication (if enabled)
- **Configuration**: Current settings

Example endpoint URLs:
- Custom URL: `https://your-app.com/api/inbound/customer-webhook`
- Legacy URL: `https://your-app.com/api/inbound/inbound_abc123...`

### 4. Send Data to Your Endpoint

#### With API Key Authentication

Using cURL:
```bash
curl -X POST https://your-app.com/api/inbound/customer-webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: inbound_your_api_key_here" \
  -d '{
    "customers": [
      {"id": 1, "name": "Alice", "email": "alice@example.com"},
      {"id": 2, "name": "Bob", "email": "bob@example.com"}
    ]
  }'
```

Using JavaScript:
```javascript
fetch('https://your-app.com/api/inbound/customer-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'inbound_your_api_key_here'
  },
  body: JSON.stringify({
    customers: [
      {id: 1, name: 'Alice', email: 'alice@example.com'},
      {id: 2, name: 'Bob', email: 'bob@example.com'}
    ]
  })
});
```

#### Without Authentication

If authentication is disabled:
```bash
curl -X POST https://your-app.com/api/inbound/customer-webhook \
  -H "Content-Type: application/json" \
  -d '{"data": "your data here"}'
```

### 5. Monitor Your Endpoint

The Inbound API page shows real-time updates:
- **Total Requests**: Number of times the endpoint has been called
- **Last Request**: Timestamp of the most recent data push
- **Status**: Active/Inactive state
- **Data Mode**: Current append/replace setting

## Authentication Options

### API Key in Header (Default)

Most common approach:
```
Header: X-API-Key
Value: inbound_abc123...
```

### Bearer Token

For OAuth-style authentication:
```
Header: Authorization
Value: Bearer inbound_abc123...
```

### Custom Header

Configure any header name:
```
Header: Your-Custom-Header
Value: inbound_abc123...
```

### No Authentication

Disable authentication for public endpoints or trusted networks.

## Data Handling

### Supported Content Types

#### JSON (Recommended)
```
Content-Type: application/json

{
  "records": [
    {"id": 1, "data": "value"},
    {"id": 2, "data": "value"}
  ]
}
```

#### Plain Text
```
Content-Type: text/plain

Raw text data
Line 2
Line 3
```

#### Form Data
```
Content-Type: application/x-www-form-urlencoded

field1=value1&field2=value2
```

### Data Modes Explained

#### Append Mode
- New data is added to existing records
- Useful for: Event logs, transaction data, continuous feeds
- Records accumulate over time
- No data is lost on updates

#### Replace Mode
- New data completely replaces existing data
- Useful for: Current state data, inventory levels, user lists
- Always shows latest snapshot
- Previous data is overwritten

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Data received successfully",
  "recordsProcessed": 42
}
```

#### Error Response
```json
{
  "error": "Invalid API key"
}
```

Status codes:
- `200 OK`: Data received successfully
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Endpoint is inactive
- `404 Not Found`: Endpoint doesn't exist
- `500 Internal Server Error`: Processing error

## Advanced Features

### Custom URLs

Create memorable, semantic endpoints:
- Instead of: `/api/inbound/inbound_a7b3c9d8e5f2...`
- Use: `/api/inbound/customer-orders`
- Use: `/api/inbound/inventory-updates`
- Use: `/api/inbound/sensor-data`

Rules for custom URLs:
- Alphanumeric characters, hyphens, and underscores
- No spaces or special characters
- Must be unique across all endpoints
- Case-sensitive

### Editing Endpoints

1. Click the edit icon on any endpoint
2. Modify:
   - Name and description
   - Data mode (append/replace)
   - Custom URL
   - Authentication settings
3. Click **Update Endpoint**

Note: Changing settings doesn't affect the API key.

### Deleting Endpoints

1. Click the delete icon
2. Confirm deletion
3. Warning: If you delete an endpoint:
   - The data source in Data Discovery remains
   - Future API calls will fail
   - The endpoint can't be recovered

### Data Source Integration

Every inbound endpoint automatically:
- Creates a data source in Data Discovery
- Names it "Inbound: [Your Endpoint Name]"
- Marks data as "JSON Ready"
- Makes it available for patterns and transformations

If you delete the data source:
- The endpoint continues to work
- Next API call recreates the data source
- Previous data is lost

## Common Use Cases

### 1. Webhook Reception

Receive webhooks from external services:
```javascript
// Stripe webhook example
app.post('/stripe-webhook', (req, res) => {
  // Forward to Cirrus inbound API
  fetch('https://your-app.com/api/inbound/stripe-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    },
    body: JSON.stringify(req.body)
  });
  res.sendStatus(200);
});
```

### 2. IoT Data Collection

Collect sensor data:
```python
import requests

sensor_data = {
  "device_id": "sensor_001",
  "temperature": 23.5,
  "humidity": 45.2,
  "timestamp": "2024-01-15T10:30:00Z"
}

requests.post(
  "https://your-app.com/api/inbound/iot-sensors",
  json=sensor_data,
  headers={"X-API-Key": "your_api_key"}
)
```

### 3. Form Submissions

Process form data:
```html
<form id="contact-form">
  <input name="name" required>
  <input name="email" type="email" required>
  <textarea name="message"></textarea>
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('contact-form').onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  await fetch('https://your-app.com/api/inbound/contact-forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    },
    body: JSON.stringify(data)
  });
};
</script>
```

### 4. Batch Data Import

Send batched data periodically:
```python
# Collect data throughout the day
batch_data = []
for record in daily_records:
    batch_data.append(record)
    
    # Send when batch is full
    if len(batch_data) >= 1000:
        requests.post(
            "https://your-app.com/api/inbound/daily-batch",
            json={"records": batch_data},
            headers={"X-API-Key": "your_api_key"}
        )
        batch_data = []
```

## Best Practices

### Security
1. **Always Use HTTPS**: Encrypt data in transit
2. **Enable Authentication**: Use API keys for production
3. **Rotate Keys**: Change API keys periodically
4. **Validate Data**: Check data on the sending side
5. **Use Custom Headers**: For additional security

### Performance
1. **Batch Data**: Send multiple records in one request
2. **Compress Large Payloads**: Use gzip encoding
3. **Handle Errors**: Implement retry logic
4. **Monitor Usage**: Track request counts
5. **Rate Limit**: Implement client-side throttling

### Data Quality
1. **Consistent Schema**: Send uniform data structures
2. **Include Timestamps**: Add time information
3. **Use Meaningful IDs**: Include unique identifiers
4. **Validate Before Sending**: Check data integrity
5. **Document Format**: Keep schema documentation

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Verify the API key is correct
- Check you're using the right header name
- Ensure authentication is enabled
- Don't include "Bearer " prefix unless using Authorization header

**"Endpoint not found" error**
- Check the URL is correct
- Verify custom URL spelling
- Ensure endpoint wasn't deleted
- Use the exact URL shown in the UI

**No data appearing**
- Check the response for errors
- Verify data was sent in request body
- Check Data Discovery page
- Ensure endpoint is active

**Data not updating**
- Check if using append vs replace mode
- Verify requests are successful
- Look at Last Request timestamp
- Check for processing errors

### Testing Your Endpoint

1. **Use Test Tools**:
   - Postman
   - cURL
   - HTTPie
   - Browser developer tools

2. **Start Simple**:
   ```bash
   curl -X POST your-endpoint-url \
     -H "X-API-Key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. **Check Response**:
   - Should return 200 status
   - Look for success message
   - Note recordsProcessed count

4. **Verify in UI**:
   - Check request count increased
   - Verify last request time updated
   - Go to Data Discovery to see data

## Integration Examples

### Node.js
```javascript
const axios = require('axios');

async function sendToInboundAPI(data) {
  try {
    const response = await axios.post(
      'https://your-app.com/api/inbound/your-endpoint',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CIRRUS_API_KEY
        }
      }
    );
    console.log('Data sent:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python
```python
import requests
import os

def send_to_inbound_api(data):
    response = requests.post(
        'https://your-app.com/api/inbound/your-endpoint',
        json=data,
        headers={
            'X-API-Key': os.getenv('CIRRUS_API_KEY')
        }
    )
    response.raise_for_status()
    return response.json()
```

### PHP
```php
<?php
$data = array('key' => 'value');
$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n" .
                     "X-API-Key: your_api_key\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);
$context  = stream_context_create($options);
$result = file_get_contents(
    'https://your-app.com/api/inbound/your-endpoint', 
    false, 
    $context
);
?>
```

## Next Steps

After setting up your inbound endpoint:
1. Navigate to **Data Discovery** to see your data
2. Apply **Patterns** to identify sensitive information
3. Create **Transformations** to process data
4. Build **Pipelines** for automated workflows
5. Generate **Synthetic Data** based on patterns

## FAQ

**Q: What's the maximum request size?**
A: 10MB per request. For larger data, split into multiple requests.

**Q: Can I update the API key?**
A: No, API keys are permanent. Create a new endpoint for a new key.

**Q: How fast is data available?**
A: Data appears in Data Discovery within seconds of a successful request.

**Q: Can I send files?**
A: For file uploads, use the standard file upload feature. Inbound API is for structured data.

**Q: Is there rate limiting?**
A: No built-in rate limiting, but implement client-side throttling for high-volume scenarios.

**Q: Can I use webhooks from multiple services?**
A: Yes, create separate endpoints for each service for better organization.

## Need Help?

- Check the [API Documentation](/api-docs) for technical details
- Review [API Sources](/docs/help/api-sources) for pulling data
- See [Database Sources](/docs/help/database-sources) for database connections
- Explore [Common Workflows](/docs/common-workflows) for integration patterns