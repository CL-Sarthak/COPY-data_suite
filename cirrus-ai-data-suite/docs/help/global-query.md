# Global Query

The Global Query feature allows you to ask natural language questions about your data and receive instant answers. It uses AI to understand your question, generate appropriate queries, and execute them across your connected data sources.

## Overview

Global Query transforms natural language questions into executable queries, supporting both:
- **Simple analysis queries** - for filtering, sorting, and aggregating numeric data
- **JavaScript code execution** - for complex calculations and transformations

## Getting Started

1. Navigate to the **Query** page from the main navigation menu
2. Type your question in natural language
3. Optionally check "Explain Methodology" to see how the answer was calculated
4. Click "Ask" to execute the query

## Example Queries

### Basic Questions

#### Count and Filter Queries
- "How many patients are in the database?"
- "Show me all patients over 65"
- "List customers from California"
- "How many orders were placed last month?"

#### Aggregation Queries
- "What is the total revenue?"
- "Show me the average order value"
- "What's the maximum transaction amount?"
- "Count records by status"

### Advanced Questions

#### Calculated Fields
- "What is the average patient age?" (calculates from date_of_birth)
- "Show me revenue by quarter" (groups by calculated time periods)
- "What percentage of orders are completed?"
- "Calculate the age distribution of customers"

#### Multi-Table Queries
When data sources are related (same database or business context):
- "Show patients with their appointment history"
- "List orders with customer details"
- "Find products and their categories"

## How It Works

### 1. Context Understanding
The system analyzes your question to identify:
- Relevant data sources
- Required fields and tables
- Necessary calculations or transformations

### 2. Query Generation
Based on your question, the AI generates either:

#### Analysis Query
For simple operations on existing numeric fields:
```json
{
  "type": "analysis",
  "sources": ["customer-data"],
  "operations": [{
    "type": "aggregate",
    "aggregations": [{
      "field": "revenue",
      "operation": "sum",
      "alias": "total_revenue"
    }]
  }]
}
```

#### JavaScript Code Query
For complex calculations or field transformations:
```javascript
const ages = data.patients.map(p => utils.calculateAge(p.date_of_birth));
result = {
  average_age: utils.average(ages),
  count: ages.length
};
```

### 3. Execution
- Queries run locally on your data
- Results are processed in real-time
- Data never leaves your system

### 4. Results Presentation
- Tables for list data
- Single values for aggregations
- Formatted output with proper labels

## Query Types

### Filtering
Ask questions that filter data:
- "Show active users"
- "Find orders over $100"
- "List patients with diabetes"

### Aggregation
Calculate statistics:
- "Average order size"
- "Total revenue by month"
- "Count of users by country"

### Sorting
Order your results:
- "Top 10 customers by revenue"
- "Most recent orders"
- "Oldest patients first"

### Grouping
Group and summarize data:
- "Sales by region"
- "Patient count by diagnosis"
- "Orders by status"

### Calculations
Perform complex calculations:
- "Average age from date of birth"
- "Days since last order"
- "Percentage of total"

## Advanced Features

### Explain Methodology
Check the "Explain Methodology" checkbox to see:
- How the query was constructed
- Which data sources were used
- What calculations were performed
- The number of records processed

### JavaScript Utilities
When using code queries, these utilities are available:
- `utils.calculateAge(dateString)` - Convert date to age
- `utils.groupBy(array, key)` - Group records by field
- `utils.average(numbers)` - Calculate average
- Standard JavaScript: `Math`, `Date`, `Array`, `JSON`

### Multi-Source Queries
The system intelligently determines when sources can be queried together:
- Tables from the same database
- Sources with explicit relationships
- Business-related data sets

## Best Practices

### Be Specific
- Include field names when known: "average of the age field"
- Specify data sources: "in the patient data"
- Add filters: "for active customers only"

### Use Natural Language
- "What's the average age?" instead of "SELECT AVG(age)"
- "Show me top customers" instead of "ORDER BY revenue DESC"
- "How many?" instead of "COUNT(*)"

### Start Simple
- Begin with basic questions
- Add complexity gradually
- Use "Explain Methodology" to understand the process

## Limitations

### Data Volume
- Large datasets are paginated
- Aggregations process all records
- Complex calculations may take time

### Field Availability
- Only cataloged fields can be queried
- Ensure data sources are transformed
- Check field annotations for context

### Query Complexity
- Joins limited to related sources
- Complex business logic may need custom code
- Some statistical functions require specific data types

## Troubleshooting

### "No field found" Errors
- Ensure the data source has been transformed
- Check that fields are properly cataloged
- Try alternative field names

### Empty Results
- Verify data exists in the source
- Check filter conditions
- Review the generated query (in dev mode)

### Calculation Errors
- Ensure date fields are properly formatted
- Check for null values in calculations
- Verify numeric fields for aggregations

### Performance Issues
- Large datasets may need optimization
- Consider adding filters to reduce data
- Use aggregations instead of full lists

## Tips & Tricks

### Time-Based Queries
- "Last 30 days of orders"
- "Revenue by month this year"
- "Patients born before 1960"

### Comparative Queries
- "Compare sales between regions"
- "Difference from last month"
- "Percentage change year-over-year"

### Discovery Queries
- "What fields are available?"
- "Show me sample patient data"
- "List all data sources"

## Security & Privacy

- All queries execute locally
- Data never leaves your environment
- No external API calls for data processing
- Audit trail of all queries maintained

## Development Mode Features

In development environments, additional information is displayed:
- Generated query structure (JSON)
- JavaScript code (if applicable)
- Execution timing
- Debug information

---

*Need help with a specific query? Try starting with the examples above and modify them for your use case.*