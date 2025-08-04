# Fix JSON Parsing Issues - Use Official Google Structured Output Only

## Problem Identified
During testing, I incorrectly used manual JSON parsing in test files, which violates the project's **MANDATORY** rules about AI integration. The CLAUDE.md clearly states that ALL AI responses must use Google's official structured output API.

## Current Issues
1. Test files used manual `JSON.parse()` instead of structured response
2. Some services may not be properly using the official Google structured output API
3. Need to ensure ALL AI integrations follow the mandatory patterns

## Implementation Plan

### Phase 1: Audit Current AI Services ✅
- [ ] Review `src/ai/gemini.ts` for proper structured output configuration
- [ ] Check `src/services/foodRecognitionService.ts` implementation  
- [ ] Verify `src/ai/weeklyContentGenerator.ts` follows patterns
- [ ] Audit all AI-related services for compliance

### Phase 2: Fix Non-Compliant Code
- [ ] Update any services using manual JSON parsing
- [ ] Ensure all AI calls use `responseMimeType: "application/json"` with `responseSchema`
- [ ] Verify proper model instance creation for each structured call
- [ ] Add proper error handling with structured output in mind

### Phase 3: Schema Validation
- [ ] Ensure all schemas are in `src/ai/schemas/` directory
- [ ] Verify OpenAPI 3.0 format compliance
- [ ] Check required properties are properly marked
- [ ] Validate enum values for controlled vocabularies

### Phase 4: Testing with Proper Structure
- [ ] Create test utilities that use official structured output API
- [ ] Remove any manual JSON parsing from test files
- [ ] Validate Quick Actions work with proper structured responses
- [ ] Ensure error handling works correctly

## Success Criteria
- ✅ ALL AI responses use Google's official structured output API
- ✅ NO manual JSON parsing anywhere in the codebase
- ✅ Proper schema compliance for all AI responses
- ✅ Quick Actions work perfectly with structured output
- ✅ Error handling respects structured output patterns

## Files to Review/Fix
1. `src/ai/gemini.ts` - Core AI configuration
2. `src/services/foodRecognitionService.ts` - Food recognition AI
3. `src/ai/weeklyContentGenerator.ts` - Weekly content generation
4. `src/components/diet/CreateRecipeModal.tsx` - Recipe generation
5. `src/components/diet/AIMealsPanel.tsx` - Meal generation
6. Any test files with manual JSON parsing (to be removed)

## Implementation Notes
- Follow the exact pattern shown in CLAUDE.md:
  ```typescript
  const modelInstance = genAI!.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });
  
  const response = await modelInstance.generateContent(prompt);
  const data = JSON.parse(response.text()); // This is the ONLY acceptable JSON parsing
  ```
- Ensure schemas are properly defined in `src/ai/schemas/`
- Maintain error handling with try-catch around the structured output calls