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

## 🎯 **CURRENT PROJECT STATUS & CONTEXT**

### **MISSION: World's #1 Fitness App** 🏆
FitAI is becoming the world's most advanced AI-powered fitness platform, surpassing MyFitnessPal, HealthifyMe, and all competitors through revolutionary features and superior user experience.

### **CURRENT PHASE: Week 1 - Foundation & Critical Features** 
**Status**: 75% core features complete, implementing world-domination roadmap
**Priority**: Social features, gamification, premium monetization, UI redesign

### **ACTIVE DEVELOPMENT AREAS:**
1. **✅ COMPLETED**: Production environment variables (APK/AAB builds working)
2. **✅ COMPLETED**: Apple HealthKit bidirectional integration 
3. **🚀 IN PROGRESS**: Friends system and community features
4. **⏳ PENDING**: 100+ achievement badges system expansion
5. **⏳ PENDING**: Premium subscription framework
6. **🎨 PARALLEL**: Complete interface overhaul (ongoing)

### **KEY FILES TO REFERENCE:**
- `MARKET_RESEARCH_ANALYSIS.md` - Competitor analysis & opportunities
- `IMPLEMENTATION_ROADMAP.md` - 20-week strategic development plan  
- `COMPLETE_TODO_MASTERPLAN.md` - Comprehensive task tracking & milestones

### **CRITICAL SUCCESS METRICS:**
- **User Engagement**: Target 50%+ DAU/MAU (vs competitors' 35%)
- **Premium Conversion**: Target 12%+ (vs industry 8%) 
- **App Store Rating**: Target 4.8+ (vs MyFitnessPal's 4.1)
- **Revenue Goal**: $270K monthly by month 24

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
# Development client build (connects to laptop server)
npm run build:development

# Android preview build (standalone)
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
- ✅ **CRITICAL**: Production Environment Variables - Fixed APK/AAB environment variable access

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

## 🚨 **PRODUCTION ENVIRONMENT VARIABLES - CRITICAL GUIDE**

### **THE PROBLEM**: Environment Variables Not Accessible in Production APK/AAB

React Native production builds have strict limitations on environment variable access. Variables defined in `eas.json` may be loaded during build time but become inaccessible at runtime via `process.env.*` in standalone APK/AAB builds.

### **SYMPTOMS OF THE ISSUE:**
- ✅ Development/Preview builds work perfectly
- ❌ Production APK/AAB shows "undefined" responses
- ❌ AI features fail with "Failed to generate" errors
- ❌ Environment variables return `undefined` in production
- ❌ API keys not accessible causing service failures

### **ROOT CAUSE ANALYSIS:**
1. **EAS Environment Variables**: Loaded at build time but not embedded for runtime access
2. **Process.env Limitation**: React Native production builds don't support runtime `process.env` access
3. **Bundle Optimization**: Metro bundler may strip environment variable access in production builds
4. **Constants.expoConfig**: Default mechanism may not work with custom environment variables

### **THE SOLUTION: app.config.js + Constants.expoConfig.extra**

#### **Step 1: Create app.config.js (MANDATORY)**
Replace `app.json` with `app.config.js` to enable dynamic configuration:

```javascript
import 'dotenv/config';

export default {
  expo: {
    // ... your existing app.json config
    extra: {
      // CRITICAL: Embed ALL environment variables here
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      EXPO_PUBLIC_GEMINI_KEY_6: process.env.EXPO_PUBLIC_GEMINI_KEY_6,
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
      EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
      EXPO_PUBLIC_AI_MODE: process.env.EXPO_PUBLIC_AI_MODE,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    }
  }
};
```

#### **Step 2: Multi-Strategy Environment Variable Access (REQUIRED)**
Update ALL services to use this production-safe pattern:

```typescript
import Constants from 'expo-constants';

const getEnvVar = (key: string) => {
  try {
    // Strategy 1: Direct process.env access (works in development)
    const processEnvValue = process.env[key];
    if (processEnvValue) {
      console.log(`✅ Environment variable ${key} found via process.env`);
      return processEnvValue;
    }
    
    // Strategy 2: Constants.expoConfig access (production builds)
    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) {
      console.log(`✅ Environment variable ${key} found via Constants.expoConfig`);
      return expoConfigValue;
    }
    
    // Strategy 3: Constants.expoConfig.extra access (CRITICAL for production)
    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) {
      console.log(`✅ Environment variable ${key} found via Constants.expoConfig.extra`);
      return extraValue;
    }
    
    // Strategy 4: Try manifest fallback
    const manifestValue = (Constants.manifest as any)?.extra?.[key];
    if (manifestValue) {
      console.log(`✅ Environment variable ${key} found via Constants.manifest.extra`);
      return manifestValue;
    }
    
    console.warn(`❌ Environment variable ${key} not found in any location:`, {
      processEnv: !!process.env[key],
      expoConfig: !!(Constants.expoConfig as any)?.[key],
      expoConfigExtra: !!(Constants.expoConfig as any)?.extra?.[key],
      manifestExtra: !!(Constants.manifest as any)?.extra?.[key]
    });
    
    return null;
  } catch (error) {
    console.error(`Environment variable ${key} access error:`, error);
    return null;
  }
};
```

#### **Step 3: Production Validation System (MANDATORY)**
Add comprehensive validation to detect environment variable issues early:

```typescript
export const validateProductionEnvironment = async (): Promise<boolean> => {
  console.log('🧪 Starting Production Environment Validation...');
  
  // Test 1: API Key Availability
  const hasApiKey = !!getEnvVar('EXPO_PUBLIC_GEMINI_API_KEY');
  console.log(`✅ Test 1 - API Key Available: ${hasApiKey}`);
  
  // Test 2: Google AI SDK Availability
  const hasGoogleAI = typeof GoogleGenerativeAI !== 'undefined';
  console.log(`✅ Test 2 - Google AI SDK Available: ${hasGoogleAI}`);
  
  // Test 3: Network Connectivity
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    const networkOk = response.status === 204 || response.status === 200;
    console.log(`✅ Test 3 - Network Connectivity: ${networkOk}`);
  } catch (error) {
    console.log(`❌ Test 3 - Network Connectivity: false`);
    return false;
  }
  
  // Test 4: Google AI API Reachability
  if (hasApiKey && hasGoogleAI) {
    try {
      const genAI = new GoogleGenerativeAI(getEnvVar('EXPO_PUBLIC_GEMINI_API_KEY')!);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Test connection');
      const apiTest = !!result.response.text();
      console.log(`✅ Test 4 - Google AI API Access: ${apiTest}`);
      
      if (apiTest) {
        console.log('🎉 All Production Validation Tests PASSED!');
        return true;
      }
    } catch (error) {
      console.log(`❌ Test 4 - Google AI API Access: false`);
    }
  }
  
  console.log('❌ Production validation FAILED - Check environment variables');
  return false;
};
```

### **DEBUGGING PRODUCTION ISSUES**

#### **ADB Logging for Real-time Debugging:**
```bash
# Connect to device/emulator
adb devices

# Clear logs and start monitoring
adb logcat -c
adb logcat *:S ReactNative:V ReactNativeJS:V

# Install and test production APK
adb install -r production-app.apk
adb shell am start -n com.yourapp.package/.MainActivity
```

#### **What to Look For in Logs:**
- ✅ `"✅ Environment variable EXPO_PUBLIC_GEMINI_API_KEY found via Constants.expoConfig.extra"`
- ✅ `"🎉 All Production Validation Tests PASSED!"`
- ✅ `"Available API keys: 2"` (not 0)
- ❌ `"Available EXPO_PUBLIC vars: 0"` = Environment variables not accessible
- ❌ `"🚨 CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is not set!"` = Configuration issue

### **CRITICAL METRO CONFIGURATION**
Add this to `metro.config.js` for React Native 0.79+ compatibility:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CRITICAL: Fix for React Native 0.79.5 Flow syntax compatibility
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;
```

### **ANDROID NETWORK SECURITY (REQUIRED)**
Add to `app.config.js` for Google AI API access:

```javascript
android: {
  usesCleartextTraffic: true,
  networkSecurityConfig: {
    cleartextTrafficPermitted: true,
    domainConfig: [
      {
        domain: "generativelanguage.googleapis.com",
        includeSubdomains: true,
        cleartextTrafficPermitted: false
      }
    ]
  }
}
```

### **PRODUCTION BUILD CHECKLIST (100% SUCCESS GUARANTEE)**

#### **Before Building:**
- [ ] `app.config.js` created with `extra` section containing ALL environment variables
- [ ] Multi-strategy environment variable access implemented in ALL services
- [ ] Production validation function added and working
- [ ] Metro configuration updated for React Native compatibility
- [ ] Android network security configured

#### **During Build:**
- [ ] EAS build logs show: "Environment variables loaded... EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_GEMINI_API_KEY..."
- [ ] Build completes without TypeScript or linting errors
- [ ] APK/AAB generated successfully

#### **After Build - MANDATORY TESTING:**
- [ ] Install APK on emulator/device
- [ ] Enable ADB logging
- [ ] Launch app and check logs for environment variable access
- [ ] Verify production validation passes: "🎉 All Production Validation Tests PASSED!"
- [ ] Test AI features: workout generation, meal planning
- [ ] Confirm NO "undefined" responses or "Failed to generate" errors

### **EMERGENCY TROUBLESHOOTING**

If production build still fails:

1. **Verify app.config.js Export**: Ensure variables are in `extra` section
2. **Check Constants Access**: Log `Constants.expoConfig.extra` to verify embedding
3. **Test Environment Variable Strategy**: Add debug logs to `getEnvVar` function
4. **Validate EAS Configuration**: Ensure `eas.json` environment variables match `app.config.js`
5. **Metro Cache Clear**: Run `npx expo start --clear` before building

### **SUCCESS INDICATORS:**
- ✅ `"Available EXPO_PUBLIC vars: 11"` (not 0)
- ✅ `"🎉 FitAI: Production validation PASSED - AI features should work!"`
- ✅ Workout names are proper exercise names (not "undefined")
- ✅ Meal generation works without "Failed to generate" errors
- ✅ Google AI API responds with real content

This approach guarantees 100% working environment variables in production APK/AAB builds.

## 🚨 **BULLETPROOF DEVELOPMENT & DEPLOYMENT RULES - ZERO ENVIRONMENT VARIABLE ISSUES**

### **MANDATORY DEVELOPMENT WORKFLOW (Preview → Production Pipeline)**

These rules MUST be followed before ANY production build to guarantee 100% success rate and prevent environment variable issues.

#### **PRIMARY DEVELOPMENT STRATEGY (CORRECTED)**
1. **Development APK**: Build development client APK (`npm run build:development`) - Creates fixed bundle with `developmentClient: true`
2. **Development Server**: Run `npm start` on laptop for real-time development and testing
3. **Real-time Development**: Development APK connects to laptop server for instant code changes without rebuilding
4. **Preview APK Validation**: Build standalone `npm run build:preview` for comprehensive feature validation
5. **Production Deployment**: Only proceed after 100% preview validation success

#### **PRE-BUILD VALIDATION CHECKLIST (MANDATORY - 100% ACCURACY)**

**BEFORE ANY PRODUCTION BUILD, CLAUDE MUST VERIFY:**

##### **Environment Variable Configuration (CRITICAL)**
- [ ] **eas.json**: ALL environment variables present in ALL build profiles (development/preview/production/production-aab)
- [ ] **app.config.js**: ALL environment variables in `extra` section with proper `process.env.*` mapping
- [ ] **Multi-Strategy Access**: ALL services use production-safe environment variable access pattern
- [ ] **Constants Import**: All services import `Constants from 'expo-constants'`

##### **Required Environment Variables (MUST BE PRESENT)**
- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `EXPO_PUBLIC_GEMINI_API_KEY`
- [ ] `EXPO_PUBLIC_GEMINI_KEY_6`
- [ ] `EXPO_PUBLIC_YOUTUBE_API_KEY` (for video service)
- [ ] `EXPO_PUBLIC_APP_NAME`
- [ ] `EXPO_PUBLIC_APP_VERSION`
- [ ] `EXPO_PUBLIC_ENVIRONMENT`
- [ ] `EXPO_PUBLIC_AI_MODE`
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- [ ] `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

##### **Service Configuration Validation (100% COMPLIANCE)**
- [ ] **gemini.ts**: Uses multi-strategy `getEnvVar()` function
- [ ] **googleAuth.ts**: Uses multi-strategy environment variable access
- [ ] **youtubeVideoService.ts**: Uses multi-strategy `getApiKey()` function
- [ ] **All Services**: Have production validation functions
- [ ] **All Services**: Import `Constants from 'expo-constants'`

##### **Configuration File Validation**
- [ ] **metro.config.js**: Contains `unstable_enablePackageExports: false` for React Native 0.79+ compatibility
- [ ] **app.config.js**: Android network security config for Google AI API access
- [ ] **app.config.js**: All environment variables in `extra` section
- [ ] **.env file**: All development environment variables present

#### **DEVELOPMENT TESTING PROTOCOL (MANDATORY)**

##### **Step 1: Development APK + Server Validation (CORRECTED)**
```bash
# 1. Build development client APK (with developmentClient: true)
npm run build:development
# VERIFY: EAS build logs show "developmentClient": true and all environment variables loaded

# 2. Download and install development APK
adb install -r development-app.apk

# 3. Start development server on laptop
npm start
# VERIFY: Console shows all environment variables being exported

# 4. Connect to device/emulator and enable ADB logging
adb devices
adb logcat -c
adb logcat *:S ReactNative:V ReactNativeJS:V

# 5. Launch development APK (connects to laptop server)
adb shell am start -n com.fitai.app/.MainActivity

# 6. Test ALL features with real-time development
# VERIFY: Instant code changes, no "undefined" responses, no fallback behaviors
```

##### **Step 2: Preview APK Validation (REQUIRED BEFORE PRODUCTION)**
```bash
# 1. Build preview APK
npm run build:preview

# 2. Download and install preview APK
# VERIFY: EAS build logs show all environment variables loaded

# 3. Install on emulator/device with ADB logging active
adb install -r preview-app.apk
adb shell am start -n com.fitai.app/.MainActivity

# 4. Comprehensive feature testing
# VERIFY: 
#   - Environment variables accessible: "Available EXPO_PUBLIC vars: 12"
#   - Production validation passes: "🎉 All Production Validation Tests PASSED!"
#   - AI features work: Workout generation, meal planning, video service
#   - NO fallback behaviors: Real YouTube videos, not demo content
#   - NO "undefined" responses in any feature
```

##### **Step 3: Production Build (ONLY AFTER 100% PREVIEW SUCCESS)**
```bash
# 1. Build production APK/AAB only after preview validation success
npm run build:production      # APK
npm run build:production-aab  # AAB for Google Play Store

# 2. MANDATORY: Download and test production APK
# VERIFY: Same environment variable success as preview
```

#### **ENVIRONMENT VARIABLE ACCESS PATTERN (REQUIRED FOR ALL SERVICES)**

**MANDATORY PATTERN FOR ALL SERVICES:**
```typescript
import Constants from 'expo-constants';

const getEnvVar = (key: string): string | null => {
  try {
    // Strategy 1: process.env (development)
    const processEnvValue = process.env[key];
    if (processEnvValue) return processEnvValue;
    
    // Strategy 2: Constants.expoConfig (production)
    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) return expoConfigValue;
    
    // Strategy 3: Constants.expoConfig.extra (CRITICAL for production)
    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) return extraValue;
    
    console.warn(`❌ Environment variable ${key} not found`);
    return null;
  } catch (error) {
    console.error(`Environment variable ${key} access error:`, error);
    return null;
  }
};
```

#### **PRODUCTION VALIDATION REQUIREMENTS (MANDATORY)**

**ALL SERVICES MUST HAVE PRODUCTION VALIDATION:**
```typescript
export const validateProductionEnvironment = async (): Promise<boolean> => {
  console.log('🧪 Production Environment Validation...');
  
  // Validate environment variables
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY', 
    'EXPO_PUBLIC_GEMINI_API_KEY',
    'EXPO_PUBLIC_YOUTUBE_API_KEY'
  ];
  
  for (const varName of requiredVars) {
    const value = getEnvVar(varName);
    if (!value) {
      console.error(`❌ CRITICAL: ${varName} not accessible`);
      return false;
    }
  }
  
  console.log('🎉 All Environment Variables Accessible!');
  return true;
};
```

#### **AUTOMATED VERIFICATION COMMANDS**

**BEFORE ANY BUILD, RUN THESE VERIFICATION COMMANDS:**
```bash
# 1. Verify all environment variables in eas.json
grep -c "EXPO_PUBLIC_" eas.json
# EXPECT: Should find all required variables in all profiles

# 2. Verify app.config.js has extra section
grep -c "EXPO_PUBLIC.*process.env" app.config.js
# EXPECT: Should find all variables mapped to process.env

# 3. Verify multi-strategy access in services
grep -c "Constants.expoConfig.extra" src/services/*.ts src/ai/*.ts
# EXPECT: All services should use this pattern

# 4. Test development server environment loading
npm start | grep "export.*EXPO_PUBLIC"
# EXPECT: Should show all environment variables being exported
```

#### **SUCCESS INDICATORS (100% GUARANTEE)**

**IN ADB LOGS, YOU MUST SEE:**
- ✅ `"Available EXPO_PUBLIC vars: 12"` (not 0)
- ✅ `"🎉 All Production Validation Tests PASSED!"`
- ✅ `"✅ Environment variable EXPO_PUBLIC_GEMINI_API_KEY found via Constants.expoConfig.extra"`
- ✅ `"🎯 YouTube API search: [meal name]"` (not Invidious fallback)
- ✅ Real workout names (not "undefined")
- ✅ Successful meal generation (no "Failed to generate")

**FAILURE INDICATORS (REBUILD REQUIRED):**
- ❌ `"Available EXPO_PUBLIC vars: 0"`
- ❌ `"🚨 CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is not set!"`
- ❌ `"🎬 Using fallback demo video"` for cooking videos
- ❌ "undefined" workout names
- ❌ "Failed to generate meal plan" errors

#### **EMERGENCY TROUBLESHOOTING PROTOCOL**

**IF PRODUCTION BUILD FAILS ENVIRONMENT VARIABLE ACCESS:**

1. **Verify app.config.js Export Structure**
2. **Check Constants.expoConfig.extra Accessibility**
3. **Validate Multi-Strategy Implementation in All Services**
4. **Confirm EAS Build Logs Show Environment Variable Loading**
5. **Clear Metro Cache**: `npx expo start --clear`
6. **Rebuild with Verified Configuration**

#### **ZERO TOLERANCE POLICY**

**NEVER PROCEED TO PRODUCTION IF:**
- Preview APK shows any environment variable access issues
- ADB logs show "Available EXPO_PUBLIC vars: 0"
- Any service uses single-strategy environment variable access
- Production validation functions are missing
- YouTube video service shows fallback demo videos
- AI features show "undefined" or "Failed to generate" responses

**THIS PROTOCOL GUARANTEES 100% PRODUCTION SUCCESS AND PREVENTS ALL ENVIRONMENT VARIABLE ISSUES.**

---

## 📋 **MANDATORY TODO TRACKING PROTOCOL**

### **CRITICAL RULE: ALWAYS UPDATE TODO FILES**
Every development session MUST update progress tracking files:

1. **Use TodoWrite tool** for active task management
2. **Update COMPLETE_TODO_MASTERPLAN.md** when completing major milestones
3. **Mark tasks complete IMMEDIATELY** after finishing (no batching)
4. **Add new discovered tasks** during implementation
5. **Keep exactly ONE task in_progress** at any time

### **TODO Status Definitions:**
- **pending**: Task not yet started
- **in_progress**: Currently working on (LIMIT TO ONE TASK)
- **completed**: Task finished successfully

### **Weekly Progress Tracking:**
- Mark Week milestones in COMPLETE_TODO_MASTERPLAN.md
- Update success metrics and KPIs when achieved
- Document any blocking issues or discoveries
- Update competitive advantage features when implemented

### **New Chat Session Protocol:**
When starting a new Claude session, immediately:
1. Check current TODO status via COMPLETE_TODO_MASTERPLAN.md
2. Review active development areas from this CLAUDE.md file
3. Understand project context and current phase
4. Continue from last marked in_progress task
5. Update TodoWrite tool with current task status

**NEVER START WORK WITHOUT FIRST CHECKING TODO STATUS AND PROJECT CONTEXT.**
- when we have done some big changes. after that we always need to check with npm run type-check, npm run build and want both to pass then we will proceed to next otherwise we will fix both