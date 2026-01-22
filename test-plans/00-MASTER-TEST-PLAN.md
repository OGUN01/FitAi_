# FitAI - Master Test Plan & Execution Guide

**Project**: FitAI - Comprehensive Feature Testing  
**Created**: 2025-01-21  
**Status**: Ready for Execution  
**Owner**: Testing Team

---

## Executive Summary

This document provides a comprehensive testing framework for all major features in the FitAI application. The testing covers **6 core features** with **60+ test scenarios** across backend APIs, client-side calculations, UI components, and data flows.

### Features Under Test

1. **Meal Generation** (AI-powered weekly meal plans)
2. **Workout Generation** (AI + rule-based workout plans)
3. **Barcode Scanning** (Product nutrition lookup)
4. **Body Analysis & Stats** (25+ health calculations)
5. **Recovery/Fatigue Tracking** (Recovery score system)
6. **Food Analysis** (AI image recognition)

---

## Test Plan Overview

| Feature            | Test Plan Document               | Test Scenarios | API Endpoints                 | Test Priority |
| ------------------ | -------------------------------- | -------------- | ----------------------------- | ------------- |
| Meal Generation    | `01-MEAL-GENERATION-TESTS.md`    | 8              | POST /diet/generate           | HIGH          |
| Workout Generation | `02-WORKOUT-GENERATION-TESTS.md` | 8              | POST /workout/generate        | HIGH          |
| Barcode Scanning   | `03-BARCODE-SCANNING-TESTS.md`   | 8              | External APIs (OpenFoodFacts) | MEDIUM        |
| Body Analysis      | `04-BODY-ANALYSIS-TESTS.md`      | 17             | Client-side only              | HIGH          |
| Recovery/Fatigue   | `05-RECOVERY-FATIGUE-TESTS.md`   | 8              | Client-side only              | MEDIUM        |
| Food Analysis      | `06-FOOD-ANALYSIS-TESTS.md`      | 10             | POST /food/recognize          | HIGH          |

**Total Test Scenarios**: 59  
**Total API Endpoints**: 3 (Cloudflare Workers) + Multiple External APIs

---

## Infrastructure & Prerequisites

### Cloudflare Workers Backend

**Worker URL**: `https://fitai-workers.sharmaharsh9887.workers.dev`  
**Status**: Live and deployed

**KV Namespaces** (Caching):

- Workout Cache: `942e889744074aaf8fec18b8fcfcead2`
- Meal Cache: `cbb7e628737b44a2ba1fe4ba5b1db738`
- Rate Limit: `8d7801f724f44f3f88af4902de262551`

**R2 Bucket** (Media Storage):

- Name: `fitai-media`
- Binding: `FITAI_MEDIA`

**AI Gateway**:

- Slug: `fitai-production`
- Account: `914022281183abb7ca6a5590fec4b994`
- URL: `https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production`

### Required Credentials

**Supabase** (from `.env.local`):

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-side only)

**Workers** (from `fitai-workers/.env`):

- VERCEL_AI_GATEWAY_KEY
- SUPABASE credentials (same as above)

**Test User**:

- Email: From `.env` TEST_USER_EMAIL
- Password: From `.env` TEST_USER_PASSWORD

### External API Dependencies

1. **OpenFoodFacts** (Barcode Scanning)
   - URL: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
   - Auth: None (public API)
   - Rate Limit: None

2. **USDA FoodData Central** (Nutrition fallback)
   - URL: `https://api.nal.usda.gov/fdc/v1/foods/search`
   - Auth: USDA_API_KEY (optional)

3. **Google Gemini** (AI Models)
   - Via Vercel AI Gateway
   - Models: gemini-2.0-flash-exp, gemini-2.5-flash
   - Structured output with Zod schemas

---

## Test Environment Setup

### 1. Clone and Configure

```bash
cd D:\FitAi\FitAI

# Verify environment files exist
ls .env.local
ls fitai-workers/.env

# Install dependencies (if needed)
npm install
cd fitai-workers && npm install
```

### 2. Verify Credentials

**Check Supabase Connection**:

```bash
# Test database connection
npx supabase status
```

**Check Workers Deployment**:

```bash
cd fitai-workers
curl https://fitai-workers.sharmaharsh9887.workers.dev/health
# Expected: {"status": "healthy"}
```

**Test Authentication**:

```bash
# Get JWT token for test user
# (Run login flow or use Supabase dashboard to get token)
export JWT_TOKEN="your_jwt_token_here"
```

### 3. Prepare Test Data

**Download Barcode Samples**:

```bash
mkdir -p test-data/barcode-samples
# Download barcode images from online barcode generators or take photos
# See 03-BARCODE-SCANNING-TESTS.md for specific barcodes needed
```

**Prepare Food Images**:

```bash
mkdir -p test-data/food-images
# Collect 20 food images covering various cuisines and conditions
# See 06-FOOD-ANALYSIS-TESTS.md for image requirements
```

**Create Test JSON Files**:

```bash
mkdir -p test-data/meal-generation
mkdir -p test-data/workout-generation
mkdir -p test-data/body-analysis
mkdir -p test-data/recovery-tracking

# Copy sample JSON files from test plans
# Each test plan has specific JSON examples
```

---

## Test Execution Strategy

### Phase 1: API Endpoint Testing (Week 1)

**Priority**: HIGH  
**Dependencies**: Cloudflare Workers deployed, credentials configured

#### Tests to Execute:

1. **Meal Generation API** (01-MEAL-GENERATION-TESTS.md)
   - Run scenarios 1-8
   - Validate response schemas
   - Check cache functionality
   - Test allergen/diet validation

2. **Workout Generation API** (02-WORKOUT-GENERATION-TESTS.md)
   - Run scenarios 1-8
   - Test both LLM and rule-based modes
   - Validate exercise database integrity
   - Check safety filters

3. **Food Recognition API** (06-FOOD-ANALYSIS-TESTS.md)
   - Run scenarios 1-10
   - Test Gemini Vision integration
   - Validate nutrition accuracy
   - Check cuisine detection (14 types)

**Success Criteria**:

- All API endpoints return 200 OK for valid requests
- Response schemas validated with Zod
- Error handling works for invalid inputs
- Rate limiting enforced (50 requests/hour)
- Cache hit rates > 60%

---

### Phase 2: Client-Side Calculations (Week 2)

**Priority**: HIGH  
**Dependencies**: None (pure calculations)

#### Tests to Execute:

1. **Body Analysis Calculations** (04-BODY-ANALYSIS-TESTS.md)
   - Test all 25+ formulas
   - Validate BMI, BMR, TDEE calculations
   - Check ethnicity-specific thresholds
   - Test pregnancy/medical condition adjustments

2. **Recovery Score Calculations** (05-RECOVERY-FATIGUE-TESTS.md)
   - Test recovery score algorithm
   - Validate sleep/HR/activity contributions
   - Check trend analysis (7-day)
   - Test overtraining detection

**Success Criteria**:

- All calculations accurate to 2 decimal places
- Formulas match documented algorithms
- Edge cases handled (min/max values)
- Performance: All calculations < 50ms

---

### Phase 3: Integration Testing (Week 3)

**Priority**: MEDIUM  
**Dependencies**: Phases 1 & 2 complete

#### Tests to Execute:

1. **Barcode Scanning Integration** (03-BARCODE-SCANNING-TESTS.md)
   - Test camera integration (Expo Camera)
   - Validate OpenFoodFacts API calls
   - Check health score calculation
   - Test add-to-meal flow

2. **End-to-End Flows**:
   - Meal generation → Database → UI display
   - Workout generation → Storage → Session tracking
   - Food scan → Recognition → Meal logging
   - Body measurements → Calculations → Progress tracking

**Success Criteria**:

- All data flows complete without errors
- Database persistence verified
- UI state management correct
- Offline support working (AsyncStorage)

---

### Phase 4: UI & UX Testing (Week 4)

**Priority**: MEDIUM  
**Dependencies**: Phase 3 complete

#### Tests to Execute:

1. **UI Component Testing**:
   - All screens render correctly
   - Loading states display
   - Error messages user-friendly
   - Success confirmations shown

2. **User Flows**:
   - Onboarding flow (body analysis)
   - Meal plan generation and viewing
   - Workout session execution
   - Progress tracking and charts

**Success Criteria**:

- Zero UI crashes
- All components accessible
- Responsive on various screen sizes
- Accessibility standards met

---

## Test Data Requirements Summary

### Images Needed

**Barcode Samples** (8 images):

- Nutella: `3017620422003`
- Parle-G: `8901725118006`
- Maggi: `8901058851496`
- Coca-Cola: `5449000000996`
- Corn Flakes: `5053827154437`
- Red Bull: `9002490100070`
- Invalid barcode: `9999999999999`
- Generic product barcode

**Food Images** (20 images):

- 5 single food items (biryani, chicken, salad, pizza, sushi)
- 5 multi-food plates (thali, burger+fries, breakfast, takeout)
- 5 edge cases (blurry, empty plate, non-food, poor lighting)
- 5 various conditions (overhead, side angle, restaurant, homemade)

### JSON Test Files

**Meal Generation** (8 files):

- vegetarian-basic.json
- vegan-allergens.json
- keto-weight-loss.json
- muscle-gain-high-protein.json
- pregnancy-second-trimester.json
- indian-cuisine.json
- minimal-request.json
- max-complexity.json

**Workout Generation** (8 files):

- beginner-bodyweight.json
- advanced-ppl-6x.json
- weight-loss-hiit.json
- injury-restrictions.json
- senior-active-recovery.json
- pregnancy-safe.json
- muscle-gain-gym.json
- minimal-request.json

**Body Analysis** (8 files):

- male-standard-adult.json
- female-asian-ethnicity.json
- athlete-low-bodyfat.json
- senior-65plus.json
- pregnancy-second-tri.json
- weight-loss-journey.json (12 weeks of progress)
- muscle-gain-journey.json (16 weeks)
- extreme-values.json

**Recovery Tracking** (8 files):

- optimal-recovery.json
- poor-recovery.json
- overtraining-risk.json (7-day trend)
- pregnancy-adjusted.json
- post-intense-workout.json
- wearable-sync-data.json
- 7-day-trend-improving.json
- 7-day-trend-declining.json

---

## Critical Test Scenarios (Must Pass)

### Meal Generation

- ✅ **MEAL-001**: Vegetarian meal plan with no diet violations
- ✅ **MEAL-002**: Vegan with allergens (peanuts, gluten) - zero violations
- ✅ **MEAL-007**: Cache working (2nd request < 500ms)

### Workout Generation

- ✅ **WORKOUT-001**: Beginner full body, bodyweight only
- ✅ **WORKOUT-004**: Injury restrictions honored (no contraindicated exercises)
- ✅ **WORKOUT-006**: Pregnancy-safe exercises only

### Barcode Scanning

- ✅ **BARCODE-001**: Nutella recognized correctly, health score 20-30
- ✅ **BARCODE-004**: Unknown barcode graceful error
- ✅ **BARCODE-008**: Add to meal flow complete

### Body Analysis

- ✅ **BODY-001**: BMI calculation accurate (±0.01)
- ✅ **BODY-003**: BMR (Mifflin-St Jeor) accurate
- ✅ **BODY-012**: Pregnancy calorie adjustments correct (+340 for 2nd tri)

### Recovery/Fatigue

- ✅ **RECOVERY-001**: Optimal recovery score (80-100)
- ✅ **RECOVERY-005**: Overtraining detection working
- ✅ **RECOVERY-007**: Workout integration (low recovery → low-demand split)

### Food Analysis

- ✅ **FOOD-001**: Single Indian dish recognized (Chicken Biryani)
- ✅ **FOOD-002**: Multiple foods detected (5+ items in thali)
- ✅ **FOOD-008**: Add to meal flow complete with database logging

---

## Performance Benchmarks

| Feature           | Metric                     | Target  | Critical | Priority |
| ----------------- | -------------------------- | ------- | -------- | -------- |
| Meal Gen API      | Response Time (Fresh)      | < 8s    | < 15s    | HIGH     |
| Meal Gen API      | Response Time (Cached)     | < 500ms | < 2s     | HIGH     |
| Workout Gen API   | Response Time (LLM)        | < 8s    | < 15s    | HIGH     |
| Workout Gen API   | Response Time (Rule-Based) | < 1s    | < 3s     | MEDIUM   |
| Food Recognition  | End-to-End                 | < 6s    | < 20s    | HIGH     |
| Barcode Scan      | Detection → Display        | < 5s    | < 15s    | MEDIUM   |
| Body Calculations | All Metrics (30+)          | < 50ms  | < 200ms  | HIGH     |
| Recovery Score    | Calculation                | < 10ms  | < 50ms   | MEDIUM   |
| Database Save     | Any Operation              | < 1s    | < 5s     | HIGH     |
| UI Render         | Any Screen                 | < 500ms | < 2s     | HIGH     |

---

## Test Execution Tracking

### Overall Progress

| Phase                 | Status      | Completion | Notes                                |
| --------------------- | ----------- | ---------- | ------------------------------------ |
| Test Plan Creation    | ✅ Complete | 100%       | All 6 test plans documented          |
| Test Data Preparation | ⏳ Pending  | 0%         | Need to gather images and JSON files |
| Phase 1: API Testing  | ⏳ Pending  | 0%         | Requires credentials configured      |
| Phase 2: Calculations | ⏳ Pending  | 0%         | Can run independently                |
| Phase 3: Integration  | ⏳ Pending  | 0%         | Depends on Phases 1 & 2              |
| Phase 4: UI/UX        | ⏳ Pending  | 0%         | Final phase                          |

### Feature-Specific Progress

**Meal Generation**: 0/8 scenarios complete  
**Workout Generation**: 0/8 scenarios complete  
**Barcode Scanning**: 0/8 scenarios complete  
**Body Analysis**: 0/17 scenarios complete  
**Recovery Tracking**: 0/8 scenarios complete  
**Food Analysis**: 0/10 scenarios complete

**Total**: 0/59 scenarios complete (0%)

---

## Risk Assessment

### High Risk Areas

1. **AI Model Reliability**
   - **Risk**: Gemini API may have intermittent downtime
   - **Mitigation**: Implement retry logic, fallback to rule-based for workouts
   - **Impact**: HIGH

2. **External API Dependencies**
   - **Risk**: OpenFoodFacts may be slow or unavailable
   - **Mitigation**: USDA fallback, cache aggressively
   - **Impact**: MEDIUM

3. **Rate Limiting**
   - **Risk**: 50 requests/hour may be too restrictive for testing
   - **Mitigation**: Use multiple test accounts, batch tests
   - **Impact**: LOW

4. **Image Size Limits**
   - **Risk**: Large food images may timeout or fail
   - **Mitigation**: Client-side image compression before upload
   - **Impact**: MEDIUM

### Medium Risk Areas

1. **Cache Invalidation**: Stale cached data may affect tests
2. **Database Performance**: High write volume during tests may slow down
3. **Mobile Device Variability**: Tests may behave differently on different devices
4. **Network Conditions**: Slow internet may cause timeouts

---

## Test Result Documentation

### Test Execution Log Template

For each feature, maintain a log in the following format:

```markdown
## Test Execution: [Feature Name]

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Production / Staging / Local

### Test Results

| Test ID  | Scenario    | Status  | Notes             | Issues |
| -------- | ----------- | ------- | ----------------- | ------ |
| FEAT-001 | Description | ✅ Pass | -                 | -      |
| FEAT-002 | Description | ❌ Fail | Error message     | #123   |
| FEAT-003 | Description | ⚠️ Warn | Low confidence    | -      |
| FEAT-004 | Description | ⏳ Skip | Dependency failed | -      |

### Issues Found

1. **Issue #123**: [Title]
   - Severity: High / Medium / Low
   - Description: ...
   - Steps to Reproduce: ...
   - Expected vs Actual: ...
   - Screenshots: ...

### Performance Metrics

| Metric        | Target | Actual | Status |
| ------------- | ------ | ------ | ------ |
| Response Time | < 8s   | 6.2s   | ✅     |
| Accuracy      | > 80%  | 85%    | ✅     |
```

---

## Next Steps

### Immediate Actions (This Session)

1. ✅ **Complete test plan creation** - DONE
2. ⏳ **Gather test data** (images, JSON files)
3. ⏳ **Configure test environment** (credentials, database)
4. ⏳ **Execute Phase 1 tests** (API endpoints)

### Upcoming Sessions

**Session 2**: Execute meal generation tests (MEAL-001 through MEAL-008)  
**Session 3**: Execute workout generation tests (WORKOUT-001 through WORKOUT-008)  
**Session 4**: Execute food analysis tests (FOOD-001 through FOOD-010)  
**Session 5**: Execute body analysis calculations (BODY-001 through BODY-017)  
**Session 6**: Execute barcode scanning tests (BARCODE-001 through BARCODE-008)  
**Session 7**: Execute recovery tracking tests (RECOVERY-001 through RECOVERY-008)  
**Session 8**: Integration and UI testing  
**Session 9**: Documentation and final report

---

## Success Criteria Summary

### Minimum Viable Test Coverage

- ✅ All critical scenarios (18 must-pass tests) passing
- ✅ API endpoints responding correctly (3 Workers endpoints)
- ✅ Core calculations accurate (25+ formulas)
- ✅ Database persistence working
- ✅ UI displaying data properly

### Ideal Test Coverage

- ✅ All 59 test scenarios passing
- ✅ Performance benchmarks met
- ✅ Zero high-severity bugs
- ✅ Integration flows complete
- ✅ Comprehensive test documentation

---

## Tools & Resources

### Testing Tools

- **API Testing**: cURL, Postman, Thunder Client
- **Image Tools**: Online barcode generators, food image databases
- **Database**: Supabase dashboard, SQL client
- **Monitoring**: Cloudflare Workers dashboard, AI Gateway analytics
- **Performance**: Chrome DevTools, React Native Debugger

### Documentation References

- Test Plans: `test-plans/01-06-*.md`
- Environment Config: `.env.local`, `fitai-workers/.env`
- API Schemas: `fitai-workers/src/utils/validation.ts`
- Calculation Formulas: `src/utils/healthCalculations.ts`

### Support Contacts

- Backend Issues: Check Cloudflare Workers logs
- Database Issues: Supabase dashboard logs
- AI Model Issues: Vercel AI Gateway dashboard
- Feature Questions: Refer to exploration session outputs

---

## Appendix: Quick Reference

### API Endpoints Quick Reference

```bash
# Meal Generation
POST https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate
Headers: Authorization: Bearer {JWT}
Body: See 01-MEAL-GENERATION-TESTS.md

# Workout Generation
POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate
Headers: Authorization: Bearer {JWT}
Body: See 02-WORKOUT-GENERATION-TESTS.md

# Food Recognition
POST https://fitai-workers.sharmaharsh9887.workers.dev/food/recognize
Headers: Authorization: Bearer {JWT}
Body: See 06-FOOD-ANALYSIS-TESTS.md

# Health Check
GET https://fitai-workers.sharmaharsh9887.workers.dev/health
Headers: None
Expected: {"status": "healthy"}
```

### Database Tables Quick Reference

```
user_meal_plans - Stores AI-generated meal plans
user_workout_plans - Stores AI-generated workout plans
meal_logs - Tracks meal consumption
progress_entries - Body measurements over time
body_analysis - Current body metrics
foods - Food database with nutrition
meal_recognition_metadata - AI recognition details
```

---

**End of Master Test Plan**

For detailed test scenarios, refer to individual test plan documents in `test-plans/` directory.
