# Claude-Driven Development Methodology for Cirrus Data Preparedness Studio

## Overview

This document outlines the development methodology we've successfully used to build the Cirrus Data Preparedness Studio using Claude as an AI development partner. This approach has enabled rapid, consistent development while maintaining high code quality and professional standards.

## Core Principles

### 1. Persistent State Management
We maintain development continuity across sessions through strategic documentation:

- **SESSION_SUMMARY.md**: A living document that captures all development progress, architectural decisions, and implementation details
- **CLAUDE.md**: Project-specific instructions and rules that override default AI behavior
- **backlog.md**: Feature backlog with status tracking and implementation notes

### 2. AI Context Loading
At the start of each session:
1. Claude reads SESSION_SUMMARY.md to understand project history
2. Claude checks CLAUDE.md for project-specific rules
3. Claude reviews backlog.md for pending features
4. This creates seamless continuity between development sessions

## Development Workflow

### 1. Feature Planning
```
User: "What's next on our backlog?"
Claude: [Reads backlog.md and suggests prioritized features]
User: "Let's implement [chosen feature]"
```

### 2. Implementation Process
- **Test-Driven**: Write tests alongside implementation
- **Incremental**: Build features in small, testable chunks
- **Documentation**: Update help content and user guides as features are built

### 3. Quality Assurance
Always run before committing:
```bash
npm run lint          # ESLint checking
npm run type-check    # TypeScript validation
npm run build         # Production build test
npm test             # Run test suite
```

### 4. Git Workflow

**CRITICAL: ALL new features must be developed on feature branches, never directly on main.**

#### Branch Naming Convention
- `feature/description` - New features (e.g., `feature/dynamic-dataset-enhancement`)
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

#### Required Workflow
```bash
# 1. Create feature branch
git checkout -b feature/descriptive-name

# 2. Implement changes on feature branch
# All development work happens here

# 3. Test thoroughly before committing
npm run lint          # Fix all linting errors
npm run type-check    # Fix all TypeScript errors
npm run build         # Ensure production build succeeds

# 4. Commit with descriptive messages
git add .
git commit -m "feat: descriptive message"

# 5. Push feature branch
git push -u origin feature/descriptive-name

# 6. Create pull request for review

# 7. Merge to main only after review and testing
git checkout main
git merge feature/descriptive-name
git push origin main
```

#### Main Branch Protection
- Main branch must remain stable at all times
- No direct commits to main branch
- All changes go through feature branch workflow
- Main branch is deployed to production

## Maintaining Consistency

### 1. UI/UX Standards

#### Color Palette (Tailwind CSS)
```
Primary: blue-600 (CirrusLabs blue)
Success: green-600
Warning: yellow-600  
Error: red-600
Background: gray-50, white
Text: gray-900 (primary), gray-700 (secondary), gray-600 (tertiary)
```

#### Component Patterns
```typescript
// Modal styling - IMPORTANT: Use blur only, NO black overlay
<div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-md w-full mx-4 overflow-hidden">
    {/* Modal content */}
  </div>
</div>

// Button styling
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>
```

#### Modal UX Standards
- **NEVER use black overlays**: Only use `backdrop-blur-sm` for modal backgrounds, not grey overlays
- **Prevent white gaps**: Always add `overflow-hidden` to modal containers to prevent white corner gaps
- **Consistent styling**: All modals should use the pattern above
- **Z-index layering**: Ensure proper z-index for notifications (z-[60]) above modals (z-50)
- **Accessibility**: Maintain visual context while focusing on modal content
- **Performance**: Blur effects provide smooth visual transitions without jarring dark overlays

### 2. Branding Guidelines

#### Logo Usage
- Always use official CirrusLabs logo from `public/cirruslabs-logo.png`
- Maintain consistent size: `h-8` for navigation, `h-12` for login page
- Include proper alt text: "CirrusLabs Logo"

#### Typography
- Headers: `font-semibold text-gray-900`
- Body text: `text-gray-700`
- Secondary text: `text-gray-600`
- Input fields: `text-gray-900 placeholder-gray-500`

### 3. Code Organization

#### Directory Structure
```
src/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes
│   └── [module]/page.tsx  # Module pages
├── components/            # Reusable React components
├── services/             # Business logic services
├── entities/             # Database entities
├── contexts/             # React contexts
├── types/                # TypeScript types
└── utils/                # Utility functions
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `DataSourceTable.tsx`)
- **Services**: camelCase (e.g., `dataProfilingService.ts`)
- **API Routes**: kebab-case (e.g., `/api/data-sources/[id]/profile`)
- **Database Entities**: PascalCase with "Entity" suffix

## State Management Strategy

### 1. Project Documentation
```markdown
# SESSION_SUMMARY.md Structure
## Project Overview
## Key Improvements Implemented
## Technical Architecture  
## Current State
## Recent Session Activities
```

### 2. Development Rules (CLAUDE.md)
```markdown
# Key rules to maintain:
- Code Quality: Always run lint and build before commits
- Database: All environments require PostgreSQL via DATABASE_URL
- File Limits: Environment-aware (4MB Vercel, 10MB standard)
- Git: Use feature branches for all development
```

### 3. Feature Tracking (backlog.md)
```markdown
### Feature Name [Status]
- **Status**: Planned/In Progress/Completed
- **Description**: Clear feature description
- **Features**: Bullet list of capabilities
- **Implementation**: Technical notes when completed
```

## Advanced Patterns

### 1. Environment Detection
```typescript
const isVercel = process.env.VERCEL === '1';
const hasExternalDb = !!process.env.DATABASE_URL;
const maxFileSize = isVercel && !hasExternalDb ? 4 * 1024 * 1024 : 10 * 1024 * 1024;
```

### 2. Async Data Loading Pattern
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType | null>(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/endpoint');
    const data = await response.json();
    setData(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. Modal Component Pattern
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
```

## LLM Integration Patterns

The application integrates LLM services for AI-powered features with robust fallback mechanisms and clear user experience patterns.

### 1. Service Architecture

#### Multi-Provider Support
```typescript
// Service interface for multiple LLM providers
interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateSuggestions(data: any): Promise<string[]>;
  analyzeContent(content: string): Promise<AnalysisResult>;
}

// Implementation with fallbacks
class DatasetEnhancementService {
  private providers: LLMProvider[] = [
    new AnthropicProvider(),
    new OpenAIProvider(),
    new LocalProvider()
  ];
  
  async enhance(data: any): Promise<EnhancementResult> {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          return await provider.enhance(data);
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }
    
    // Fallback to rule-based enhancement
    return this.fallbackEnhancement(data);
  }
}
```

### 2. Fallback Mechanisms

#### Graceful Degradation
```typescript
// Always provide functionality even when LLM is unavailable
const [llmAvailable, setLlmAvailable] = useState(false);
const [fallbackMode, setFallbackMode] = useState(false);

useEffect(() => {
  checkLLMAvailability();
}, []);

const checkLLMAvailability = async () => {
  try {
    const response = await fetch('/api/ml/status');
    const { available } = await response.json();
    setLlmAvailable(available);
  } catch (error) {
    setFallbackMode(true);
  }
};

// UI adapts based on availability
{llmAvailable ? (
  <AIEnhancementButton onClick={handleAIEnhancement} />
) : (
  <ManualEnhancementForm onSubmit={handleManualEnhancement} />
)}
```

### 3. Visual Indicators for AI Features

#### AI-Powered Feature Badges
```typescript
// Component pattern for AI features
function AIFeatureBadge({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
      }`} />
      <span className="text-xs text-gray-600">
        {isActive ? 'AI-Powered' : 'Rule-Based'}
      </span>
    </div>
  );
}

// Usage in components
<div className="flex items-center justify-between">
  <h3>Dataset Enhancement</h3>
  <AIFeatureBadge isActive={llmAvailable} />
</div>
```

#### Loading States for LLM Operations
```typescript
// Pattern for LLM operations with proper loading states
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [progress, setProgress] = useState(0);

const handleAIAnalysis = async () => {
  setIsAnalyzing(true);
  setProgress(0);
  
  try {
    // Simulate progress updates
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    const result = await datasetEnhancementService.analyze(data);
    
    clearInterval(progressTimer);
    setProgress(100);
    
    // Process result
  } catch (error) {
    // Handle error with fallback
  } finally {
    setIsAnalyzing(false);
    setProgress(0);
  }
};

// UI with progress indication
{isAnalyzing && (
  <div className="flex items-center gap-2">
    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
    <span>AI analyzing... {progress}%</span>
  </div>
)}
```

### 4. Error Handling and User Communication

#### LLM Service Error Patterns
```typescript
// Comprehensive error handling for LLM services
try {
  const result = await llmService.process(data);
  return result;
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    showToast('AI service is temporarily busy. Using fallback processing.', 'warning');
    return await fallbackService.process(data);
  } else if (error.code === 'API_KEY_INVALID') {
    showToast('AI service configuration error. Contact administrator.', 'error');
    return await fallbackService.process(data);
  } else {
    showToast('AI processing failed. Using rule-based approach.', 'info');
    return await fallbackService.process(data);
  }
}
```

#### User-Friendly Status Messages
```typescript
// Status component for LLM availability
function LLMStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'checking' && (
        <>
          <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
          <span className="text-gray-600">Checking AI availability...</span>
        </>
      )}
      {status === 'available' && (
        <>
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-green-600">AI enhancement available</span>
        </>
      )}
      {status === 'unavailable' && (
        <>
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-yellow-600">Using rule-based processing</span>
        </>
      )}
    </div>
  );
}
```

### 5. Configuration and Environment Management

#### Environment-Aware LLM Configuration
```typescript
// Environment-based LLM configuration
const LLM_CONFIG = {
  development: {
    provider: 'simulated',
    apiKey: null,
    fallbackEnabled: true
  },
  production: {
    provider: process.env.LLM_PROVIDER || 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    fallbackEnabled: true
  }
};

// Service initialization
const initializeLLMService = () => {
  const config = LLM_CONFIG[process.env.NODE_ENV] || LLM_CONFIG.development;
  
  if (!config.apiKey && config.provider !== 'simulated') {
    console.warn('LLM API key not found, using fallback mode');
    return new FallbackLLMService();
  }
  
  return new LLMService(config);
};
```

## Testing Strategy

### 1. Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction', () => {
    render(<ComponentName />);
    fireEvent.click(screen.getByRole('button'));
    // Assert expected behavior
  });
});
```

### 2. Service Testing
```typescript
import { serviceFunction } from './service';

describe('Service', () => {
  it('should process data correctly', () => {
    const input = { /* test data */ };
    const result = serviceFunction(input);
    expect(result).toEqual(/* expected output */);
  });
});
```

## Deployment Considerations

### 1. Environment Variables
```env
# Required for production
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...

# Optional ML configuration
ML_DETECTION_ENABLED=true
ML_PROVIDER=simulated
```

### 2. Build Process
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest"
  }
}
```

### 3. Pre-commit Hooks
The project uses git pre-commit hooks to ensure code quality:
- ESLint validation
- TypeScript type checking
- Automatic fix for common issues

## Common Patterns & Solutions

### 1. Data Transformation
All data sources are transformed to a unified JSON format:
```typescript
interface UnifiedDataCatalog {
  catalogId: string;
  sourceId: string;
  records: UnifiedDataRecord[];
  schema: { fields: Field[] };
}
```

### 2. Pattern Detection
Hybrid approach combining multiple methods:
- Field-aware detection for structured data
- Context-aware detection for unstructured text
- ML-powered detection (when enabled)
- Relationship detection for connected fields

### 3. State Management
- React hooks for component state
- Context API for authentication
- Local state with API synchronization
- Optimistic UI updates

## Tips for Working with Claude

### 1. Session Initialization
Always start with:
```
"Read SESSION_SUMMARY.md to get up to date on the project"
```

### 2. Feature Development
Be specific about requirements:
```
"I need [feature] that [does X] for [use case]"
```

### 3. Debugging
Provide error messages and context:
```
"I'm getting [error] when [doing action]. Here's the console output: [...]"
```

### 4. Code Review
Ask for specific checks:
```
"Check this for ESLint errors and TypeScript issues"
```

## Benefits of This Methodology

1. **Rapid Development**: AI assistance accelerates coding
2. **Consistency**: Documented patterns ensure uniform implementation
3. **Quality**: Built-in testing and linting maintain standards
4. **Continuity**: State management enables long-term projects
5. **Knowledge Transfer**: Documentation facilitates team collaboration

## Conclusion

This methodology has enabled us to build a complex, professional-grade application with:
- 50+ React components
- 20+ API endpoints
- Comprehensive test coverage
- Production-ready deployment
- Consistent UI/UX design
- Scalable architecture

By following these patterns and maintaining proper documentation, teams can leverage AI assistance while ensuring code quality and project coherence.

---
*Document created: June 6, 2025*
*Last updated: June 9, 2025*
*Project: Cirrus Data Preparedness Studio*
*Organization: CirrusLabs*