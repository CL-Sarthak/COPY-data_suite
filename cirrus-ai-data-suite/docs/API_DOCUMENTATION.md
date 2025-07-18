# API Documentation - Cirrus Data Suite

## Overview
This document provides comprehensive API documentation for the Cirrus Data Suite, including all endpoints, request/response formats, and usage examples.

## Table of Contents
- [Data Sources](#data-sources)
  - [AI Summary](#data-source-ai-summary)
  - [AI Q&A](#data-source-ai-qa)
  - [Table Detection](#data-source-tables)
  - [Table-Level Summaries](#table-level-summaries)
- [Patterns](#patterns)
- [Transformations](#transformations)
- [Authentication](#authentication)
- [Error Handling](#error-handling)

## Data Sources

### Data Source AI Summary

#### Generate or Update AI Summary
Generate an AI-powered summary for a data source or update with user-edited content.

**Endpoint:** `POST /api/data-sources/{id}/summary`

**Parameters:**
- `id` (path) - Data source ID

**Request Body:**
```json
{
  "action": "generate" | "update",
  "userSummary": "string" // Only for update action
}
```

**Response:**
```json
{
  "aiSummary": "string",
  "userSummary": "string",
  "summaryGeneratedAt": "ISO 8601 timestamp",
  "summaryUpdatedAt": "ISO 8601 timestamp",
  "summaryVersion": "number"
}
```

**Example - Generate AI Summary:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/summary \
  -H "Content-Type: application/json" \
  -d '{"action": "generate"}'
```

**Example - Update User Summary:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/summary \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "userSummary": "This dataset contains customer transaction records from 2024."
  }'
```

#### Get Summary
Retrieve the current summary for a data source.

**Endpoint:** `GET /api/data-sources/{id}/summary`

**Parameters:**
- `id` (path) - Data source ID

**Response:**
```json
{
  "aiSummary": "string",
  "userSummary": "string",
  "summaryGeneratedAt": "ISO 8601 timestamp",
  "summaryUpdatedAt": "ISO 8601 timestamp",
  "summaryVersion": "number"
}
```

### Data Source AI Q&A

#### Ask a Question
Submit a question about a data source and receive an AI-powered answer.

**Endpoint:** `POST /api/data-sources/{id}/ask`

**Parameters:**
- `id` (path) - Data source ID

**Request Body:**
```json
{
  "question": "string",
  "explainMethodology": "boolean", // Optional, default false
  "conversationHistory": [ // Optional
    {
      "role": "user" | "assistant",
      "content": "string"
    }
  ],
  "requestedFields": ["string"], // Optional, specific fields to analyze
  "recordLimit": "number" // Optional, default 100
}
```

**Response:**
```json
{
  "answer": "string",
  "metadata": {
    "recordsAnalyzed": "number",
    "totalRecords": "number",
    "dataSource": "string",
    "currentFields": ["string"] | "all"
  },
  "dataRequest": { // Optional, when more data is needed
    "fields": ["string"],
    "recordLimit": "number",
    "reason": "string"
  }
}
```

**Example - Simple Question:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the average age of customers?"
  }'
```

**Example - Question with Methodology:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How many unique insurance providers are in the data?",
    "explainMethodology": true
  }'
```

**Example - Follow-up with More Data:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How many unique insurance providers are in the data?",
    "requestedFields": ["Insurance Provider"],
    "recordLimit": 10000,
    "conversationHistory": [
      {
        "role": "user",
        "content": "How many unique insurance providers are in the data?"
      },
      {
        "role": "assistant",
        "content": "Based on the sample of 100 records, there are 7 unique insurance providers."
      }
    ]
  }'
```

#### AI Q&A Features

1. **Intelligent Data Fetching**: The AI automatically detects when it needs more data to answer questions accurately, especially for:
   - Counting unique values
   - Calculating averages or distributions
   - Analyzing patterns across the full dataset

2. **Server-Side Statistics**: For large datasets, the API calculates statistics server-side to avoid sending massive payloads:
   - Numeric fields: count, sum, average, min, max
   - Date fields: count, earliest, latest
   - Categorical fields: distribution with counts and percentages

3. **Conversation Context**: The API maintains conversation history within a session, allowing for follow-up questions and clarifications.

4. **Methodology Explanation**: When enabled, the AI explains:
   - What data was analyzed
   - How calculations were performed
   - Any assumptions made
   - Whether working with sample or full data

## Patterns

[Existing pattern API documentation would go here]

## Transformations

[Existing transformation API documentation would go here]

## Authentication

Currently, the API does not require authentication for local development. In production environments, appropriate authentication headers should be included.

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "string",
  "message": "string", // Optional detailed message
  "status": "number"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Resource not found
- `500` - Internal server error

## Rate Limiting

When using AI features:
- AI summary generation is limited by the underlying LLM service rate limits
- AI Q&A queries are processed sequentially per data source
- Large data analysis may take several seconds to complete

## Best Practices

1. **AI Summaries**:
   - Generate summaries after data transformation for best results
   - User summaries override AI summaries when both exist
   - Regenerate summaries after significant data changes

2. **AI Q&A**:
   - Start with simple questions to understand your data
   - Enable methodology explanation for complex calculations
   - Use the data request feature when prompted for accurate results
   - Session persistence allows for natural follow-up questions

3. **Performance**:
   - For large datasets, the API automatically uses server-side statistics
   - Categorical data with >50KB of unique values triggers size limits
   - Consider filtering data before asking distribution questions

### Data Source Tables

#### Get Tables for Data Source
Retrieve all tables/sheets within a data source. Automatically detects tables if not already discovered.

**Endpoint:** `GET /api/data-sources/{id}/tables`

**Parameters:**
- `id` (path) - Data source ID

**Response:**
```json
{
  "tables": [
    {
      "id": "string",
      "tableName": "string",
      "tableType": "sheet" | "table" | "nested" | "single",
      "tableIndex": "number",
      "recordCount": "number",
      "aiSummary": "string",
      "userSummary": "string"
    }
  ],
  "detected": "boolean" // true if tables were just detected
}
```

**Example:**
```bash
curl http://localhost:3000/api/data-sources/123/tables
```

### Table-Level Summaries

#### Generate or Update Table Summary
Generate an AI-powered summary for a specific table or update with user-edited content.

**Endpoint:** `POST /api/data-sources/{id}/tables/{tableId}/summary`

**Parameters:**
- `id` (path) - Data source ID
- `tableId` (path) - Table ID

**Request Body:**
```json
{
  "action": "generate" | "update",
  "userSummary": "string" // Only for update action
}
```

**Response:**
```json
{
  "aiSummary": "string",
  "userSummary": "string",
  "summaryGeneratedAt": "ISO 8601 timestamp",
  "summaryUpdatedAt": "ISO 8601 timestamp",
  "summaryVersion": "number"
}
```

**Example - Generate Table Summary:**
```bash
curl -X POST http://localhost:3000/api/data-sources/123/tables/456/summary \
  -H "Content-Type: application/json" \
  -d '{"action": "generate"}'
```

#### Get Table Summary
Retrieve the current summary for a specific table.

**Endpoint:** `GET /api/data-sources/{id}/tables/{tableId}/summary`

**Parameters:**
- `id` (path) - Data source ID
- `tableId` (path) - Table ID

**Response:**
```json
{
  "aiSummary": "string",
  "userSummary": "string",
  "summaryGeneratedAt": "ISO 8601 timestamp",
  "summaryUpdatedAt": "ISO 8601 timestamp",
  "summaryVersion": "number"
}
```

#### Table Detection
Tables are automatically detected during data transformation for:
- **Excel files**: Each sheet becomes a table
- **Database imports**: Each imported table
- **Nested JSON**: Arrays of objects within records
- **Single sources**: Creates one "Main" table

The system updates `hasMultipleTables` and `tableCount` fields on the data source entity.