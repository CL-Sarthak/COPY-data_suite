# API Sources Help Guide

## Overview

API Sources enable you to connect Cirrus Data Suite to external REST APIs and web services. This feature allows you to import data from any HTTP endpoint, with support for authentication, pagination, scheduling, and complex data extraction.

## Key Features

- **Multiple Authentication Methods**: API Key, Bearer Token, Basic Auth, or None
- **Flexible HTTP Methods**: GET and POST requests
- **Custom Headers & Parameters**: Full control over request configuration  
- **Automatic Refresh**: Schedule regular data updates
- **Pagination Support**: Handle large datasets across multiple pages
- **JSONPath Extraction**: Extract specific data from complex responses
- **Request Preview**: Test connections before importing

## Getting Started

### 1. Navigate to API Sources

From the main menu:
- Click **Data Sources** → **APIs**
- Or use quick navigation: **Data & Discovery** → **File Sources** → **APIs**

### 2. Create a New API Connection

1. Click the **Add API Connection** button
2. Fill in the basic details:
   - **Name**: Descriptive name for your API connection
   - **Description**: Optional details about the data source
   - **Request URL**: The API endpoint URL
   - **Method**: Choose GET or POST

### 3. Configure Authentication

Select your authentication type and provide credentials:

#### No Authentication
- For public APIs that don't require authentication

#### API Key
- **Header Name**: e.g., `X-API-Key`, `api-key`
- **API Key**: Your API key value
- Sends as: `HeaderName: your-api-key`

#### Bearer Token
- **Token**: Your bearer token
- Sends as: `Authorization: Bearer your-token`

#### Basic Authentication
- **Username**: Your username
- **Password**: Your password
- Sends as: `Authorization: Basic base64(username:password)`

### 4. Add Custom Headers (Optional)

Add any additional headers required by the API:
```
Content-Type: application/json
Accept: application/json
X-Custom-Header: value
```

### 5. Configure Query Parameters (Optional)

Add URL parameters for GET requests:
- **Parameter Name**: e.g., `limit`, `offset`, `filter`
- **Value**: Parameter value

### 6. Configure Request Body (POST only)

For POST requests, provide the JSON body:
```json
{
  "filter": "active",
  "include": ["id", "name", "email"],
  "limit": 100
}
```

### 7. Set Up Pagination (Optional)

Configure how to handle paginated responses:

#### Offset/Limit Pagination
- **Pagination Type**: Offset/Limit
- **Offset Parameter**: e.g., `offset`, `skip`
- **Limit Parameter**: e.g., `limit`, `count`
- **Limit Value**: e.g., `100`
- **Total Items Path**: JSONPath to total count (e.g., `$.total`)

#### Page-Based Pagination
- **Pagination Type**: Page-based
- **Page Parameter**: e.g., `page`
- **Page Size Parameter**: e.g., `pageSize`
- **Page Size**: e.g., `50`
- **Total Pages Path**: JSONPath to total pages (e.g., `$.totalPages`)

### 8. Test Your Connection

1. Click **Test Connection**
2. Review the response preview
3. Verify the data structure is correct
4. Check response time and size

### 9. Configure Data Extraction

Use JSONPath to extract specific data from the response:
- **Extract Path**: JSONPath expression
- Examples:
  - `$.data` - Extract the 'data' field
  - `$.results[*]` - Extract all items from 'results' array
  - `$.users[?(@.active==true)]` - Extract only active users

### 10. Set Refresh Schedule (Optional)

Enable automatic data refresh:
- **Auto Refresh**: Toggle on
- **Refresh Interval**: Choose frequency (minutes)
  - Every 15 minutes
  - Every 30 minutes
  - Every hour
  - Every 6 hours
  - Every 24 hours

## Advanced Configuration

### Rate Limiting

Configure rate limits to respect API restrictions:
- **Rate Limit**: Requests per minute
- **Timeout**: Request timeout in seconds (default: 30)

### Retry Configuration

Handle temporary failures:
- **Max Retries**: Number of retry attempts
- **Retry Delay**: Delay between retries (exponential backoff)

### Response Handling

- **Success Status Codes**: 200, 201, 202
- **Error Handling**: Automatic retry on 429, 503
- **Response Size Limit**: 50MB maximum

## Working with Imported Data

### Data Structure

Imported API data is stored as JSON and automatically:
- Marked as "JSON Ready" for immediate use
- Available in Data Discovery
- Ready for transformation and analysis

### Refresh Behavior

- **Manual Refresh**: Click "Refresh" button anytime
- **Automatic Refresh**: Based on configured interval
- **Refresh Status**: View last refresh time and status
- **Error Handling**: Failed refreshes are logged and retried

### Data Modes

When refreshing data:
- **Replace Mode**: New data replaces all existing data
- **Append Mode**: New data is added to existing records (coming soon)

## Common Use Cases

### 1. REST API Integration
```
URL: https://api.example.com/v1/users
Method: GET
Auth: Bearer Token
Headers: Accept: application/json
```

### 2. Webhook Data Collection
```
URL: https://webhook.site/your-endpoint
Method: POST
Body: {"action": "fetch", "since": "2024-01-01"}
```

### 3. Public API Access
```
URL: https://api.github.com/users/octocat/repos
Method: GET
Auth: None
Extract Path: $[*].name
```

### 4. Paginated API
```
URL: https://api.example.com/products
Method: GET
Pagination: Offset/Limit
Offset Param: offset
Limit Param: limit
Limit Value: 100
```

## Best Practices

### Security
1. **Store Credentials Securely**: Never share API keys
2. **Use HTTPS**: Always use secure connections
3. **Minimum Permissions**: Request only needed scopes
4. **Rotate Keys**: Regularly update API credentials

### Performance
1. **Limit Data**: Use parameters to fetch only needed data
2. **Enable Pagination**: For large datasets
3. **Set Appropriate Intervals**: Don't over-fetch
4. **Monitor Usage**: Track API rate limits

### Data Quality
1. **Validate Responses**: Use test connection first
2. **Handle Errors**: Configure appropriate error handling
3. **Extract Precisely**: Use specific JSONPath expressions
4. **Document Sources**: Use clear names and descriptions

## Troubleshooting

### Connection Issues

**"Connection timeout" error**
- Increase timeout value
- Check if API is accessible
- Verify network connectivity

**"401 Unauthorized" error**
- Verify authentication credentials
- Check if API key is active
- Ensure correct auth method

**"429 Too Many Requests" error**
- Reduce refresh frequency
- Implement rate limiting
- Check API quota limits

### Data Issues

**"No data extracted"**
- Verify JSONPath expression
- Check response structure
- Test without extraction path

**"Invalid JSON response"**
- Ensure API returns JSON
- Check Content-Type headers
- Verify response format

**"Partial data only"**
- Configure pagination
- Increase limit parameters
- Check total items count

## JSONPath Examples

### Basic Extraction
- `$.data` - Root level field
- `$.users[0]` - First user
- `$.users[*].email` - All email addresses

### Advanced Extraction
- `$.users[?(@.age > 18)]` - Filter by condition
- `$..[?(@.type == 'admin')]` - Deep search
- `$.products[0:5]` - Array slice

### Nested Data
- `$.company.employees[*].name` - Nested arrays
- `$.results..id` - All IDs at any level
- `$.data.*.values` - Wildcard selection

## API Authentication Examples

### API Key in Header
```
Header Name: X-API-Key
API Key: sk_live_abc123xyz
```

### Bearer Token
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Basic Auth
```
Username: api_user
Password: secure_password
```

### Custom Headers
```
X-Client-Id: your-client-id
X-Client-Secret: your-client-secret
Content-Type: application/json
```

## Limitations

- **Response Size**: Maximum 50MB per request
- **Timeout**: Maximum 300 seconds per request
- **Refresh Rate**: Minimum 5 minutes between refreshes
- **Concurrent Requests**: Limited to prevent overload

## Next Steps

After setting up your API source:
1. Navigate to **Data Discovery** to explore imported data
2. Create **Patterns** to identify sensitive information
3. Set up **Transformations** for data processing
4. Build **Pipelines** to automate workflows
5. Use data in **Synthetic Data** generation

## FAQ

**Q: Can I use GraphQL APIs?**
A: Yes, use POST method with GraphQL query in the request body.

**Q: How do I handle OAuth authentication?**
A: Currently, use Bearer tokens after obtaining them externally. OAuth flow support is coming soon.

**Q: Can I chain multiple API calls?**
A: Not directly, but you can create multiple API sources and combine them in pipelines.

**Q: Is webhook reception supported?**
A: For receiving webhooks, use the Inbound API feature instead.

**Q: Can I transform data during import?**
A: JSONPath extraction is available during import. For complex transformations, use the transformation features after import.

## Need Help?

- Review the [API Documentation](/api-docs) for programmatic access
- Check [Inbound API Guide](/docs/help/inbound-api) for receiving data
- See [Common Workflows](/docs/common-workflows) for integration patterns