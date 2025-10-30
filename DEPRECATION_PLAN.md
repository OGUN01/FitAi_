# Deprecation Plan for OLD Onboarding Screens

## Status: READY FOR TESTING ⏳

**⚠️ IMPORTANT**: Do NOT remove files until Option B implementation has been tested and verified working!

## Files to Deprecate

### 1. OLD Onboarding Screens (3 files)

#### DietPreferencesScreen.tsx
**Location**: `src/screens/onboarding/DietPreferencesScreen.tsx`
**Size**: 526 lines
**Status**: Superseded by DietPreferencesTab (27 fields vs 4 fields)

**Current Usage**:
- ✅ EditOverlay.tsx (imported but can be removed with EditOverlay)
- ✅ OnboardingFlow.tsx (OLD flow, not used anymore)
- ✅ ReviewScreen.tsx (type imports only)
- ✅ index.ts (export only)
- ⚠️ endToEndTest.ts (test file, can be updated)

**Replacement**: `src/screens/onboarding/tabs/DietPreferencesTab.tsx`

#### WorkoutPreferencesScreen.tsx
**Location**: `src/screens/onboarding/WorkoutPreferencesScreen.tsx`
**Size**: 842 lines
**Status**: Superseded by WorkoutPreferencesTab (22 fields vs variable fields)

**Current Usage**:
- ✅ EditOverlay.tsx (imported but can be removed with EditOverlay)
- ✅ OnboardingFlow.tsx (OLD flow, not used anymore)
- ✅ ReviewScreen.tsx (type imports only)
- ✅ index.ts (export only)
- ⚠️ endToEndTest.ts (test file, can be updated)

**Replacement**: `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx`

#### PersonalInfoScreen.tsx
**Location**: `src/screens/onboarding/PersonalInfoScreen.tsx`
**Size**: ~1000 lines (estimated)
**Status**: Enhanced in Phase 2 (12 fields), but superseded by PersonalInfoTab (10 fields)

**Decision**: Keep for now OR deprecate
- Option A: Keep as lightweight alternative for quick edits
- Option B: Deprecate in favor of PersonalInfoTab for consistency

**Current Usage**:
- ✅ EditOverlay.tsx (imported but can be removed with EditOverlay)
- ✅ OnboardingFlow.tsx (OLD flow, not used anymore)
- ✅ index.ts (export only)

**Replacement**: `src/screens/onboarding/tabs/PersonalInfoTab.tsx`

### 2. Supporting Files

#### EditOverlay.tsx
**Location**: `src/components/profile/EditOverlay.tsx`
**Size**: ~250 lines (estimated)
**Status**: No longer needed (NEW navigation replaces it)

**Purpose**: Modal overlay for OLD editing system
**Replacement**: Direct navigation to OnboardingContainer

**Current Usage**:
- ✅ ProfileScreen.tsx (imports EditProvider, can be updated)

#### EditContext.tsx
**Location**: `src/contexts/EditContext.tsx`
**Size**: 584 lines
**Status**: Can be deprecated after testing

**Purpose**: Manages edit state for OLD system
**Replacement**: OnboardingContainer handles its own state

**Current Usage**:
- ✅ ProfileScreen.tsx (wraps with EditProvider)
- ✅ EditOverlay.tsx (uses context)

**Decision**: Keep temporarily for fallback, remove after confirming NEW system works

### 3. OLD Onboarding Flow

#### OnboardingFlow.tsx
**Location**: `src/screens/onboarding/OnboardingFlow.tsx`
**Size**: Unknown
**Status**: Superseded by OnboardingContainer

**Purpose**: OLD sequential onboarding flow
**Replacement**: OnboardingContainer with tabs

**Decision**: Keep for reference, can be deprecated

## Deprecation Steps

### Phase 1: Testing (CURRENT)
- [ ] Test Option B implementation thoroughly
- [ ] Verify all 170+ fields accessible
- [ ] Confirm data saves correctly
- [ ] Test on iOS and Android
- [ ] Collect user feedback

### Phase 2: Backup
- [ ] Create backups of all deprecated files
- [ ] Tag current git commit
- [ ] Document deprecation in CHANGELOG

### Phase 3: Comment Out Imports
- [ ] Comment out imports in EditOverlay.tsx
- [ ] Comment out imports in OnboardingFlow.tsx
- [ ] Comment out imports in index.ts
- [ ] Run type-check to identify any issues

### Phase 4: Move to Deprecated Folder
- [ ] Create `src/screens/onboarding/_deprecated/` folder
- [ ] Move OLD screens to deprecated folder
- [ ] Create `src/components/profile/_deprecated/` folder
- [ ] Move EditOverlay to deprecated folder
- [ ] Create `src/contexts/_deprecated/` folder
- [ ] Move EditContext to deprecated folder

### Phase 5: Update Imports
- [ ] Remove exports from index.ts
- [ ] Update any remaining imports
- [ ] Run type-check
- [ ] Run tests
- [ ] Verify app still builds

### Phase 6: Final Removal (After 2 weeks)
- [ ] Confirm no issues in production
- [ ] Delete _deprecated folders
- [ ] Update documentation
- [ ] Celebrate! 🎉

## Files to Keep (DO NOT Remove)

### ✅ NEW System (Keep All)
- `src/screens/onboarding/OnboardingContainer.tsx` - Main container with edit mode
- `src/screens/onboarding/tabs/PersonalInfoTab.tsx` - 10 fields
- `src/screens/onboarding/tabs/DietPreferencesTab.tsx` - 27 fields
- `src/screens/onboarding/tabs/BodyAnalysisTab.tsx` - 30 fields
- `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx` - 22 fields
- `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` - 50+ fields

### ✅ Support Files (Keep All)
- `src/hooks/useOnboardingState.tsx` - State management for NEW system
- `src/components/onboarding/OnboardingTabBar.tsx` - Tab navigation
- `src/components/onboarding/OnboardingProgressIndicator.tsx` - Progress display
- `src/services/onboardingService.ts` - Data persistence
- `src/types/onboarding.ts` - Type definitions

### ✅ Navigation (Keep All)
- `src/components/navigation/MainNavigation.tsx` - Updated with OnboardingContainer support
- `src/screens/main/ProfileScreen.tsx` - Updated with NEW navigation

## Testing Before Removal

### Manual Testing Checklist:
- [ ] Open app → Profile → Edit Profile
- [ ] Test Personal Information editing
- [ ] Test Diet Preferences editing
- [ ] Test Body Analysis editing
- [ ] Test Workout Preferences editing
- [ ] Test Health Metrics viewing
- [ ] Verify Save button works
- [ ] Verify Cancel button works
- [ ] Verify data persists
- [ ] Test on iOS
- [ ] Test on Android

### Automated Testing:
- [ ] Run `npm test`
- [ ] Run `npm run type-check`
- [ ] Run `npm run build`
- [ ] Check for console errors

## Rollback Plan

### If Issues Found:
1. Revert git commit
2. Restore OLD screens from backup
3. Update imports
4. Test OLD system still works
5. Document issues
6. Fix issues
7. Re-test
8. Re-attempt deprecation

## Impact Analysis

### Lines of Code to Remove:
- DietPreferencesScreen.tsx: 526 lines
- WorkoutPreferencesScreen.tsx: 842 lines
- PersonalInfoScreen.tsx: ~1000 lines (if deprecated)
- EditOverlay.tsx: ~250 lines
- EditContext.tsx: 584 lines (if deprecated)
- **Total**: ~3,200 lines removed

### Benefits:
- ✅ Reduced code complexity
- ✅ Easier maintenance
- ✅ No code duplication
- ✅ Single source of truth
- ✅ Faster development

### Risks:
- ⚠️ Breaking changes if NEW system has bugs
- ⚠️ User confusion during transition
- ⚠️ Need to update tests

## Timeline

### Week 1: Testing
- Day 1-2: Manual testing
- Day 3-4: Bug fixes
- Day 5: User testing
- Day 6-7: Final fixes

### Week 2: Deprecation
- Day 8: Create backups
- Day 9: Move to deprecated folder
- Day 10: Update imports
- Day 11-12: Verify no issues
- Day 13-14: Monitor production

### Week 3: Removal
- Day 15: Final check
- Day 16: Remove deprecated files
- Day 17: Update documentation
- Day 18-21: Monitor for issues

## Success Criteria

### Must Achieve:
- [ ] All 170+ fields accessible from Settings
- [ ] No data loss
- [ ] No crashes
- [ ] Type-check passes
- [ ] Tests pass
- [ ] User feedback positive

### Should Achieve:
- [ ] Faster app performance
- [ ] Reduced bundle size
- [ ] Improved code maintainability

## Notes

- **Current Status**: Option B implementation complete, awaiting testing
- **Next Action**: Test Option B implementation thoroughly
- **Estimated Completion**: 2-3 weeks after testing begins
- **Risk Level**: Low (can rollback if needed)

## Contact

If you encounter issues during deprecation:
1. Check git history for previous implementation
2. Review OPTION_B_IMPLEMENTATION_COMPLETE.md
3. Check OPTION_B_TESTING_GUIDE.md
4. Restore from backup if necessary

---

**Status**: 📝 Plan Ready → ⏳ Awaiting Testing → 🚫 Awaiting Deprecation
**Created**: Phase 2 (Option B Implementation Complete)
**Last Updated**: Awaiting first test results
