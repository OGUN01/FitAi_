# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 **CRITICAL DEVELOPMENT RULES - NEVER VIOLATE**

### **ZERO Tolerance Policies:**
1. **No Empty Catch Blocks**: Every catch block MUST implement proper error handling with logging and user feedback
2. **No Hardcoded Values**: Use THEME constants, environment variables, or configuration files
3. **No Console.log in Production**: Use proper logging service with context and error reporting
4. **No Module-Level React Native APIs**: Wrap in functions or hooks to prevent HostFunction errors
5. **Security First**: Never commit secrets, always validate inputs, use HTTPS only

### **Performance Requirements - Non-Negotiable:**
- **App Startup**: <3 seconds cold start time
- **Screen Transitions**: 60fps animations, <500ms transition time
- **Memory Usage**: <200MB typical usage, no memory leaks
- **Bundle Size**: <50MB total application size
- **AI Responses**: <5 seconds for workout generation
- **Type Safety**: 100% TypeScript coverage, zero `any` types

### **Error Handling Standards - Mandatory Pattern:**
```typescript
// ✅ REQUIRED: Comprehensive error handling
try {
  const result = await service.operation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  ErrorReporting.captureException(error);
  return { 
    success: false, 
    error: 'User-friendly message',
    context: 'Technical context for debugging'
  };
}

// ❌ FORBIDDEN: Empty or inadequate error handling
try {
  await service.operation();
} catch (error) {
  console.log(error); // NOT ALLOWED
}
```

### **AI Integration Standards - Strict Compliance:**
- **ALWAYS** use Google's structured output API with `responseMimeType: "application/json"`
- **ALWAYS** provide `responseSchema` parameter for validation
- **ALWAYS** implement timeout handling (5s max) and fallback demo mode
- **ALWAYS** log AI interactions for debugging and optimization

## Plan & Review Protocol

### Before Starting Work:
1. Write detailed plan to `.claude/tasks/TASK_NAME.md`
2. Include implementation strategy, risks, and success criteria
3. Break down into measurable tasks with time estimates
4. **MVP Focus**: Implement core functionality first, optimize later
5. **Get approval before proceeding** - No exceptions

### During Implementation:
1. Update plan with progress and any discovered complexities
2. Document decisions and technical trade-offs
3. Add detailed change descriptions for handover to other engineers
4. Run quality checks: TypeScript, linting, testing

## Project Overview

FitAI is an AI-powered fitness companion mobile app built with React Native (Expo), TypeScript, and Supabase backend. It integrates Google Gemini 2.5 Flash for 100% personalized workout and nutrition content generation with ZERO generic data.

### Revolutionary AI Approach
- **100% Personalized Content**: Every workout and meal is uniquely generated for each user
- **Zero Generic Data**: No "Bench Press, Burpees, Deadlift" placeholders - all content is AI-created
- **Experience Intelligence**: 1-2 weeks of content based on user's experience level
- **Structured Output**: Fixed JSON parsing with proper `responseMimeType` configuration

## Essential Commands

### Development
```bash
# Start development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Testing
```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Building
```bash
# Android preview build
npm run build:preview

# Production builds
npm run build:production      # APK
npm run build:production-aab  # AAB for Play Store

# Submit to store
npm run submit:production
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Native + Expo (v53)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind for RN)
- **State**: Zustand stores in `src/stores/`
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Google Gemini 2.5 Flash via `@google/generative-ai`

### Key Directories
- `src/ai/` - AI service integration with structured output schemas
  - `weeklyContentGenerator.ts` - Experience-based weekly plan generation
  - `gemini.ts` - Fixed structured output configuration
- `src/services/` - Backend services (Supabase, auth, storage)
  - `exerciseVisualService.ts` - ExerciseDB API integration with caching
  - `advancedExerciseMatching.ts` - Multi-tier matching for 100% coverage
- `src/stores/` - Zustand state management
- `src/screens/` - Screen components organized by flow
  - `main/FitnessScreen.tsx` - Weekly workout plan generation UI
  - `main/DietScreen.tsx` - Personalized meal planning with macros
  - `workout/WorkoutSessionScreen.tsx` - Enhanced with visual preloading
- `src/components/` - Reusable UI components (atomic design)
  - `fitness/ExerciseGifPlayer.tsx` - Professional GIF display with tier indicators
  - `fitness/ExerciseInstructionModal.tsx` - Full-screen exercise guidance
- `src/features/` - Business logic engines (workouts, nutrition)
- `src/utils/` - Testing and validation utilities
  - `testExerciseMatching.ts` - Comprehensive testing suite

### Critical Patterns

1. **AI Integration**: ALWAYS use Google's official structured output API for ALL LLM responses (see `src/ai/schemas/`)
   - CRITICAL: Use `responseMimeType: "application/json"` with `responseSchema`
   - Always create fresh model instance for structured output
   - MANDATORY: Use `JSON.parse(response.text())` to convert JSON string to object
   - NEVER use plain text responses or custom JSON cleaning
   - ALL AI responses must follow defined schemas in `src/ai/schemas/`
2. **100% Personalization**: Never use generic data - everything must be AI-generated
   - Database tables (exercises, foods) should be empty of generic content
   - All content driven by user's onboarding data
3. **Weekly Content Generation**: Use experience-level based planning
   - Beginner: 1 week (3 workouts)
   - Intermediate: 1.5 weeks (5 workouts)
   - Advanced: 2 weeks (6 workouts)
4. **State Management**: Use Zustand stores, not React Context
5. **Offline Support**: Utilize `offlineStore` for data persistence
6. **Authentication**: Handle through `authStore` and `src/services/auth.ts`
7. **Type Safety**: All components and functions must have proper TypeScript types
8. **Visual Exercise System**: Always use advanced matching for 100% coverage
   - Use `exerciseVisualService.preloadWorkoutVisuals()` for instant performance
   - Leverage multi-tier matching system for intelligent exercise mapping  
   - Display tier indicators (🎯🔍🧠📂⚡) for match quality feedback
   - Implement performance metrics display for premium user experience

### Recently Fixed Issues ✅
- ✅ Shadow styles compatibility - Fixed deprecated properties
- ✅ Form validation in onboarding - All forms working
- ✅ Session persistence - Enhanced with refresh tokens
- ✅ Gemini structured output - Fixed JSON parsing errors
- ✅ Generic data removal - 100% AI-generated content
- ✅ Complete Setup button - Onboarding flow working
- ✅ Visual Exercise Enhancement - Million-dollar visual system with 100% coverage
- ✅ Netflix-Level Performance - <100ms response times with advanced matching
- ✅ Professional Visual Experience - Tier indicators and performance metrics

### Database Schema (15 Tables)
- **Core Tables**: user_profiles, fitness_goals, diet_preferences, workout_preferences, body_analysis
- **Content Tables**: exercises (AI-only), foods (AI-only), workouts, meals
- **AI Content Tables**: nutrition_goals, meal_logs (NEW)
- **Tracking Tables**: workout_sessions, progress_entries

### Environment Setup
- Uses EAS for builds and deployments
- Environment variables managed through `eas.json`
- Supabase keys in environment variables (never commit these)

When making changes:
1. Always run type-check before committing
2. Follow existing component patterns in the codebase
3. Update tests for any logic changes
4. Use the established service layer for API calls
5. Maintain the atomic design structure for components

## Google Sign-In Setup

Google Sign-In is fully implemented and ready to use. To enable it:

1. **Follow the setup guide**: See `GOOGLE_SIGNIN_SETUP.md` for complete instructions
2. **Get OAuth credentials**: Set up Google Cloud Console project and download config files
3. **Configure Supabase**: Enable Google provider in your Supabase Auth settings
4. **Set environment variables**: Add Google Client IDs to EAS configuration
5. **Add config files**: Place `google-services.json` and `GoogleService-Info.plist` in project root

### Quick Setup Checklist:
- [ ] Google Cloud Console project created
- [ ] OAuth consent screen configured
- [ ] Android/iOS/Web OAuth clients created
- [ ] google-services.json downloaded and placed in project root
- [ ] GoogleService-Info.plist downloaded and placed in project root
- [ ] Environment variables added to eas.json
- [ ] Supabase Auth Google provider enabled
- [ ] Test build created and Google Sign-In tested

### Files Ready:
- ✅ `src/services/googleAuth.ts` - Complete Google Auth implementation
- ✅ `src/screens/onboarding/LoginScreen.tsx` - Google Sign-In button enabled
- ✅ `src/screens/onboarding/SignUpScreen.tsx` - Google Sign-Up button enabled
- ✅ `App.tsx` - Google Auth initialization on app start
- ✅ `app.json` - Google Services configuration
- ✅ `eas.json` - Environment variables for Google Client IDs

## AI Implementation Guidelines

### LLM Output Rules - MANDATORY FOR ALL AI RESPONSES

**RULE #1: STRUCTURED OUTPUT ONLY**
- Every single AI response MUST use Google's official structured output API
- NEVER use plain text responses for any data generation
- ALL responses must have corresponding schemas in `src/ai/schemas/`

**RULE #2: OFFICIAL API CONFIGURATION**
- Always use `responseMimeType: "application/json"` 
- Always provide `responseSchema` parameter
- Create fresh model instance for each structured call

**RULE #3: GOOGLE OFFICIAL STRUCTURED OUTPUT ONLY**
- ✅ **MANDATORY**: Use Google's official structured output API for 100% accuracy
- Always use `responseMimeType: "application/json"` with `responseSchema`  
- Google returns JSON as STRING via `response.text()` - parse with `JSON.parse()`
- 🚨 **NEVER** manually prompt AI to "generate JSON" - use schema only
- JSON.parse() is REQUIRED for Google's structured output and allowed for AsyncStorage, database, cache

**RULE #4: SCHEMA COMPLIANCE**
- Every schema must be in OpenAPI 3.0 format with proper typing
- Required properties must be marked as `required: [....]`
- Use proper enum values for controlled vocabularies

**RULE #5: ERROR HANDLING**
- Wrap JSON.parse in try-catch blocks
- Retry on parse failures with exponential backoff
- Log raw response on parsing errors for debugging

### Gemini Structured Output (CRITICAL)
```typescript
// CORRECT: Always create fresh model instance for structured output
const modelInstance = genAI!.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    responseMimeType: "application/json",  // CRITICAL
    responseSchema: schema,
    temperature: 0.7,
    maxOutputTokens: 8192
  }
});

// STRUCTURED OUTPUT: Returns object directly - NO PARSING NEEDED
const response = await modelInstance.generateContent(prompt);
const data = response.text(); // Returns structured object directly - NOT a string!
```

### Weekly Content Generation Pattern
```typescript
// Use aiService.generateWeeklyWorkoutPlan() not individual workouts
const response = await aiService.generateWeeklyWorkoutPlan(
  personalInfo,
  fitnessGoals,
  weekNumber
);

// Plan duration based on experience:
// - Beginner: 3 workouts over 1 week
// - Intermediate: 5 workouts over 1.5 weeks
// - Advanced: 6 workouts over 2 weeks
```

### Zero Generic Content Rule
- NEVER display generic exercises like "Bench Press, Burpees"
- NEVER populate database with sample workout data
- All content must be generated from user's specific onboarding data
- Empty database tables are correct - they get filled with AI content

### Macro Calculation
```typescript
// Use Mifflin-St Jeor equation for calorie calculation
const bmr = gender === 'male' 
  ? 10 * weight + 6.25 * height - 5 * age + 5
  : 10 * weight + 6.25 * height - 5 * age - 161;

// Apply activity multiplier and goal adjustment
const tdee = bmr * activityMultiplier;
const targetCalories = goal === 'weight_loss' ? tdee * 0.85 : tdee;
```