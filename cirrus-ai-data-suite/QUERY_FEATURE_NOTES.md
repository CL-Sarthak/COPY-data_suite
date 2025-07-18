# Global Query Feature - JavaScript Code Execution Implementation

## Date: July 14, 2025

### Problem Solved
The "Explain Methodology" feature was failing when the LLM needed to calculate values from fields requiring transformation (e.g., calculating average age from date_of_birth fields). The system could only aggregate numeric fields, causing queries to fail or return incorrect results.

### Solution Implemented
Added JavaScript code execution capability to allow the LLM to generate and execute custom code for complex data transformations.

### Technical Implementation

#### 1. Extended DataQuery Type (`src/types/dataAnalysis.ts`)
```typescript
export interface DataQuery {
  type: 'analysis' | 'code';  // Added 'code' type
  sources: string[];
  // ... existing fields ...
  code?: string;               // JavaScript code to execute
  runtime?: 'safe' | 'isolated'; // Execution environment
}
```

#### 2. Created CodeExecutionService (`src/services/codeExecutionService.ts`)
- Uses Node.js `vm` module for safe code execution
- Provides utility functions:
  - `utils.calculateAge(date)` - Calculate age from date of birth
  - `utils.groupBy(array, key)` - Group data by field
  - `utils.average(numbers)` - Calculate average
- Executes code in isolated context with 30-second timeout
- Returns results via `result` variable

#### 3. Updated Query Generation
The LLM now decides between:
- **'analysis' type**: For simple filtering, sorting, and direct numeric aggregations
- **'code' type**: For complex calculations, transformations, or date-based operations

Example generated code for average age:
```javascript
const ages = data.Patient_Records
  .map(p => utils.calculateAge(p.date_of_birth))
  .filter(age => age !== null);
result = { 
  average_age: utils.average(ages), 
  count: ages.length 
};
```

### Key Benefits
1. **Unlimited flexibility** - LLM can generate code for any calculation
2. **No data-specific hacks** - General purpose solution
3. **Secure execution** - Code runs in isolated VM context
4. **Local processing** - All data stays within the system
5. **Better user experience** - "Explain Methodology" now works correctly

### Usage Flow
1. User asks: "What is the average patient age?"
2. LLM sees only `date_of_birth` field exists
3. LLM generates JavaScript code to calculate ages
4. CodeExecutionService executes the code safely
5. Results returned to LLM for presentation
6. User sees correct answer with or without methodology

### Future Enhancements
- Add more utility functions as needed
- Consider adding data validation helpers
- Potentially support other scripting languages
- Add execution metrics and monitoring

### Security Considerations
- Code runs in isolated VM context
- No access to file system or network
- Limited to provided data and utilities
- 30-second execution timeout
- All operations logged for audit

### Files Modified
- `/src/types/dataAnalysis.ts` - Added code query type
- `/src/services/codeExecutionService.ts` - New service for code execution
- `/src/services/dataAnalysisService.ts` - Route code queries to new service
- `/src/services/queryExecutionService.ts` - Updated prompts and logging

### Testing Notes
The system was tested with the "average patient age" query where only date_of_birth exists. Both with and without "Explain Methodology" checked, the system now returns the correct calculated average.