# CirrusLabs New Project Setup Guide

## Overview
This guide helps you start a new project using the CirrusLabs development methodology and UI/UX standards established for the Cirrus Data Preparedness Studio. Follow these steps to create a consistent, professional foundation for your project.

## Prerequisites
- Node.js 18+ and npm installed
- Git configured with your CirrusLabs email
- Access to Claude (Anthropic's AI assistant)
- CirrusLabs logo file (`cirruslabs-logo.png`)

## Step 1: Create Project Foundation Documents

Before any coding, create these essential files that enable the Claude development methodology:

### A. Create `CLAUDE.md` (Project Rules & Standards)
```markdown
# Development Notes for [PROJECT NAME]

## Code Quality & Linting
This project has automatic linting and type checking.

### Available Scripts
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run dev` - Start development server
- `npm run build` - Build production version

### Pre-commit Requirements
Always run these before every commit:
```bash
npm run lint
npm run type-check
npm run build
```

## UI/UX Standards

### CirrusLabs Color Palette (Tailwind CSS)
- **Primary**: blue-600 (CirrusLabs blue)
- **Success**: green-600
- **Warning**: yellow-600
- **Error**: red-600
- **Background**: gray-50, white
- **Text**: gray-900 (primary), gray-700 (secondary), gray-600 (tertiary)

### Component Patterns
```javascript
// Modal styling
<div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-md w-full mx-4">
    {/* Modal content */}
  </div>
</div>

// Button styling
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>

// Input styling
<input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
```

### Typography Standards
- **Headers**: `font-semibold text-gray-900`
- **Body text**: `text-gray-700`
- **Secondary text**: `text-gray-600`
- **Input fields**: `text-gray-900 placeholder-gray-500`

### Logo Usage
- Always use official CirrusLabs logo from `public/cirruslabs-logo.png`
- Navigation: `h-8`, Login page: `h-12`
- Include proper alt text: "CirrusLabs Logo"

## Git Workflow
- Use feature branches for all development: `feature/feature-name`
- Write descriptive commit messages with proper prefixes (feat:, fix:, docs:, etc.)
- Include Claude attribution in commits:
```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Development Rules
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for the goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files unless requested
- Follow feature branch workflow for all development work

# important-instruction-reminders
These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.
```

### B. Create `SESSION_SUMMARY.md` (Living Development History)
```markdown
# [PROJECT NAME] Development Session Summary

## Project Overview
[Brief description of what this project does and its main purpose]

## Technical Architecture
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS v4
- **Backend**: PostgreSQL (required)
- **Authentication**: [Your auth strategy]
- **Key Technologies**: [List main technologies and libraries]

## Development Workflow Established
- **SESSION_SUMMARY.md** serves as continuous development log
- **CLAUDE.md** contains project-specific rules and UI standards
- **backlog.md** tracks features and priorities
- Feature branch workflow for all development work

## Current State
Project initialized with:
- Next.js 15 foundation with TypeScript
- Tailwind CSS v4 configured with CirrusLabs color palette
- Core UI components following CirrusLabs standards
- Authentication system with branded login page
- Development workflow and tooling established

## Files Created
```
src/
├── app/
│   ├── layout.tsx (Root layout with CirrusLabs branding)
│   ├── page.tsx (Home page)
│   └── api/ (API routes)
├── components/
│   ├── Navigation.tsx (CirrusLabs branded navigation)
│   ├── LoginPage.tsx (Authentication with branding)
│   └── ui/ (Foundation UI components)
├── types/ (TypeScript definitions)
└── utils/ (Helper functions)
```

## Next Session Preparation
To continue development:
1. Read SESSION_SUMMARY.md, CLAUDE.md, and backlog.md
2. Check current git branch and status
3. Review pending features in backlog
4. Follow established patterns for new components

---
*Last updated: [DATE] - Project Initialization Complete*
```

### C. Create `backlog.md` (Feature Planning & Tracking)
```markdown
# [PROJECT NAME] - Feature Backlog

## Core Features

### 1. [First Major Feature]
- **Status**: Planned
- **Description**: [What this feature accomplishes]
- **Features**:
  - [Specific capability 1]
  - [Specific capability 2]
  - [Specific capability 3]
- **Implementation**: [Technical notes will be added when completed]

### 2. [Second Major Feature]
- **Status**: Planned
- **Description**: [What this feature accomplishes]
- **Features**:
  - [Specific capability 1]
  - [Specific capability 2]

## Infrastructure & Polish

### 3. Authentication System
- **Status**: Planned
- **Description**: User authentication with CirrusLabs branding
- **Features**:
  - Login/logout functionality
  - Protected routes
  - User session management
  - CirrusLabs branded login page

### 4. Core UI Components
- **Status**: Planned
- **Description**: Foundation component library with CirrusLabs styling
- **Features**:
  - Button components (primary, secondary, danger)
  - Modal dialogs with backdrop blur
  - Form inputs with proper validation styling
  - Navigation component with logo and user menu
  - Card components for content display

## Future Enhancements

### 5. [Additional Feature Ideas]
- **Status**: Planned
- **Description**: [Future capabilities to consider]

---

## How to Use This Backlog

1. **Status Indicators**:
   - ⏳ In Progress
   - 📋 Planned
   - ✅ Completed
   - 🚫 Cancelled

2. **Adding New Items**: Add features under appropriate sections or create new sections as needed

3. **Prioritization**: Items at the top of each section are higher priority

4. **Updates**: Update status and add implementation notes as work progresses

---
*Last Updated: [DATE]*
```

## Step 2: Initialize Claude Session

Start your first development session with Claude using this prompt:

```
I'm starting a new project called [PROJECT NAME] using the CirrusLabs development methodology. Please help me set up:

1. A Next.js 15 project with TypeScript and Tailwind CSS v4
2. CirrusLabs branding and color scheme implementation
3. Basic project structure following established patterns
4. Foundation UI components with CirrusLabs styling
5. Authentication system with branded login page

Use these CirrusLabs UI/UX standards:
- Primary color: blue-600 (CirrusLabs blue)
- Success: green-600, Warning: yellow-600, Error: red-600
- Background: gray-50/white, Text: gray-900/700/600
- Modal pattern: backdrop-blur-sm with border-2 border-gray-600
- Button pattern: px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
- Typography: font-semibold for headers, proper text color hierarchy
- Use CirrusLabs logo in navigation (h-8) and login page (h-12)

Please create the initial project structure and foundation components.
```

## Step 3: Project Setup Checklist

Follow this checklist to ensure complete setup:

### Phase 1: Foundation ✅
- [ ] Create Next.js 15 project with TypeScript (`npx create-next-app@latest`)
- [ ] Install Tailwind CSS v4 (`npm install tailwindcss@next @tailwindcss/typography`)
- [ ] Create CLAUDE.md with project rules and UI standards
- [ ] Create SESSION_SUMMARY.md with project overview
- [ ] Create backlog.md with initial feature list
- [ ] Copy DEVELOPMENT_METHODOLOGY.md from reference project (if available)
- [ ] Add CirrusLabs logo to `public/cirruslabs-logo.png`

### Phase 2: Core Configuration ✅
- [ ] Configure `tailwind.config.js` with CirrusLabs color palette
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure ESLint with proper rules
- [ ] Set up package.json scripts for lint, type-check, build
- [ ] Create `.gitignore` with appropriate exclusions
- [ ] Initialize git repository

### Phase 3: Foundation Components ✅
- [ ] Create `src/components/Navigation.tsx` with CirrusLabs branding
- [ ] Create `src/components/LoginPage.tsx` with authentication flow
- [ ] Build foundation UI components:
  - [ ] `src/components/ui/Button.tsx`
  - [ ] `src/components/ui/Modal.tsx`
  - [ ] `src/components/ui/Input.tsx`
  - [ ] `src/components/ui/Card.tsx`
- [ ] Create root layout (`src/app/layout.tsx`) with proper structure
- [ ] Set up authentication context and protected routes

### Phase 4: Development Workflow ✅
- [ ] Verify all scripts work (`npm run lint`, `npm run type-check`, `npm run build`)
- [ ] Test development server (`npm run dev`)
- [ ] Create first feature branch (`git checkout -b feature/initial-setup`)
- [ ] Make initial commit with proper attribution
- [ ] Push to repository

### Phase 5: First Feature ✅
- [ ] Choose first feature from backlog.md
- [ ] Implement following established patterns
- [ ] Update SESSION_SUMMARY.md with progress
- [ ] Verify all UI follows CirrusLabs standards
- [ ] Test build and linting before commit

## Step 4: Ongoing Development Workflow

### Starting Each Session
Always begin Claude sessions with:
```
"I'm continuing work on [PROJECT NAME]. Please read SESSION_SUMMARY.md, CLAUDE.md, and backlog.md to get up to date on the project."
```

### Feature Development Process
1. **Check backlog**: `"What's next on our backlog?"`
2. **Create feature branch**: `git checkout -b feature/feature-name`
3. **Implement feature**: Follow established patterns and UI standards
4. **Quality check**: Run lint, type-check, build, and tests
5. **Commit**: Include proper message and Claude attribution
6. **Update documentation**: Add progress to SESSION_SUMMARY.md
7. **Merge**: After testing, merge to main branch

### Quality Gates
Before every commit:
```bash
npm run lint          # Check code style
npm run type-check    # Verify TypeScript
npm run build         # Test production build
npm test             # Run test suite (if configured)
```

## Step 5: Essential File Templates

### Tailwind Config Template (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CirrusLabs color palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // Primary blue
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

### Package.json Scripts Template
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

### Navigation Component Template
```typescript
// src/components/Navigation.tsx
import Image from 'next/image';

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Image
              src="/cirruslabs-logo.png"
              alt="CirrusLabs Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="ml-3 text-xl font-semibold text-gray-900">
              [PROJECT NAME]
            </span>
          </div>
          {/* Add navigation items and user menu */}
        </div>
      </div>
    </nav>
  );
}
```

## Tips for Success

### 1. Start Small
Begin with basic setup and core components before adding complex features.

### 2. Follow Patterns
Always reference the established UI patterns and component structures.

### 3. Document Progress
Keep SESSION_SUMMARY.md updated with each development session.

### 4. Use Feature Branches
Never develop directly on main - always use feature branches.

### 5. Maintain Consistency
Regularly ask Claude to verify CirrusLabs standards compliance.

### 6. Test Early
Run build and lint checks frequently to catch issues early.

## Common Commands Reference

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run lint                   # Check code quality
npm run type-check            # Verify TypeScript

# Git workflow
git checkout -b feature/name   # Create feature branch
git add .                     # Stage changes
git commit -m "feat: description"  # Commit changes
git push -u origin feature/name    # Push feature branch
git checkout main             # Switch to main
git merge feature/name        # Merge feature
```

## Troubleshooting

### Common Issues
1. **Build failures**: Check TypeScript errors with `npm run type-check`
2. **Lint errors**: Run `npm run lint` and fix reported issues
3. **Missing dependencies**: Ensure all required packages are installed
4. **Styling issues**: Verify Tailwind config and class names

### Getting Help
When asking Claude for help:
- Always start with reading project documentation
- Provide specific error messages and context
- Ask for code reviews: "Check this for ESLint and TypeScript issues"
- Request pattern compliance: "Ensure this follows CirrusLabs UI standards"

---

## Conclusion

This guide provides everything needed to start a new project using the proven CirrusLabs development methodology. By following these steps and maintaining the documented patterns, you'll create consistent, professional applications with high code quality and seamless AI-assisted development.

The key to success is maintaining the documentation files (SESSION_SUMMARY.md, CLAUDE.md, backlog.md) and always starting Claude sessions by reading the current project state.

---
*Guide created: June 6, 2025*
*Based on: Cirrus Data Preparedness Studio methodology*
*Organization: CirrusLabs*