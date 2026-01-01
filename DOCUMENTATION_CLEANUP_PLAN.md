# Documentation Cleanup Plan

**Date:** 2025-12-29
**Total Files:** 56 markdown files
**Action:** Remove outdated/duplicate docs, keep scientific and current architecture docs

---

## ✅ KEEP (14 files) - Essential Documentation

### Backend Architecture (4 files)
1. **AI_MIGRATION_STATUS.md** - Current migration guide (Workers backend)
2. **CLOUDFLARE_CAPACITY_ANALYSIS.md** - Scaling analysis for 200K users
3. **COST_BREAKDOWN_200K_USERS.md** - Financial breakdown and projections
4. **DATABASE_OPTIONS_ANALYSIS.md** - Database comparison (why we chose Supabase)

### Scientific/Onboarding Logic (3 files)
5. **ONBOARDING_SYSTEM_COMPLETE.md** - Complete onboarding system documentation
6. **COMPLETE_FIELD_MAPPING.md** - Field mappings between tables
7. **DATA_FLOW_DIAGRAM.md** - How data flows through the system

### Current Policies (2 files)
8. **NO_MOCK_DATA_POLICY.md** - Why we removed mock data
9. **README.md** - Project overview

### Feature Documentation (3 files)
10. **FEATURE_INVENTORY.md** - Complete feature list
11. **AURORA_UI_STATUS.md** - Aurora UI implementation status
12. **DESIGN.md** - Design system

### Other Important (2 files)
13. **SCALABILITY_PLAN.md** - Growth roadmap
14. **PROMPT.md** - AI prompt templates (if contains scientific logic)

---

## ❌ DELETE (42 files) - Outdated/Duplicate Documentation

### Old Backend Architecture (5 files)
- BACKEND_ARCHITECTURE.md (superseded by AI_MIGRATION_STATUS.md)
- BACKEND_ARCHITECTURE_UPDATED.md (duplicate)
- BACKEND_IMPLEMENTATION_SUMMARY.md (outdated)
- BACKEND_INTEGRATION.md (outdated)
- AI_GENERATION_FLOW.md (outdated - was client-side AI)

### Temporary Audit Reports (15 files)
- @AGENT.md (temporary agent notes)
- @fix_plan.md (temporary fix plan)
- ADVANCED_REVIEW_AUDIT.md (completed)
- ANALYTICS_SCREEN_AUDIT.md (completed)
- BODY_ANALYSIS_AUDIT.md (completed)
- COMPLETE_AUDIT_REPORT.md (completed)
- COMPREHENSIVE_AUDIT_SUMMARY.md (completed)
- DIET_PREFERENCES_AUDIT.md (completed)
- DIET_SCREEN_AUDIT.md (completed)
- FITNESS_SCREEN_AUDIT.md (completed)
- HOME_SCREEN_AUDIT.md (completed)
- PROFILE_SCREEN_AUDIT.md (completed)
- RELIABILITY_AUDIT_REPORT.md (completed)
- UI_IMPLEMENTATION_GAP_ANALYSIS.md (completed)
- WORKOUT_PREFERENCES_AUDIT.md (completed)

### Data Consistency/Fix Reports (10 files)
- DATA_CONSISTENCY_AUDIT_REPORT.md (completed)
- DATA_CONSISTENCY_FIXES_APPLIED.md (completed)
- DATA_CONSISTENCY_PHASE1_COMPLETE.md (completed)
- DATA_CONSISTENCY_PHASE2_COMPLETE.md (completed)
- DATA_CONSISTENCY_SUMMARY.md (completed)
- CRITICAL_FIXES_COMPLETED.md (completed)
- RELIABILITY_FIXES_COMPLETE.md (completed)
- CLIENT_CLEANUP_SUMMARY.md (completed)
- PHASE1_CLEANUP_COMPLETE.md (completed)
- COMPREHENSIVE_ISSUES_REPORT.md (completed)

### Phase Completion Reports (4 files)
- PHASE_4_COMPLETION_SUMMARY.md (completed)
- PHASE_A_COMPLETION_SUMMARY.md (completed)
- PHASE2_ACTION_PLAN.md (outdated)
- IMPLEMENTATION_TRACKER.md (outdated)

### Duplicate/Redundant Guides (5 files)
- QUICK_FIX_GUIDE.md (duplicate)
- QUICK_FIX_REFERENCE.md (duplicate)
- QUICK_REFERENCE.md (duplicate)
- AMBIGUITIES_AND_GAPS.md (outdated)
- RELIABILITY_SUMMARY.md (duplicate of RELIABILITY_AUDIT_REPORT.md)

### UI/UX Issue Reports (3 files)
- UI_UX_ISSUES.md (issues fixed)
- REMAINING_MICRO_INTERACTIONS.md (outdated tracker)
- docs/HOMESCREEN_UIUX_ISSUES.md (if exists - completed)

---

## 📊 Summary

| Category | Keep | Delete |
|----------|------|--------|
| Backend Architecture | 4 | 5 |
| Scientific/Onboarding | 3 | 0 |
| Policies | 2 | 0 |
| Features | 3 | 0 |
| Audits/Reports | 0 | 15 |
| Fix Reports | 0 | 10 |
| Phase Reports | 0 | 4 |
| Duplicates | 0 | 5 |
| UI/UX | 0 | 3 |
| Other | 2 | 0 |
| **TOTAL** | **14** | **42** |

---

## Cleanup Result

After cleanup:
- 14 essential files remain
- 42 outdated/duplicate files removed
- 75% reduction in documentation clutter
- All scientific and architectural knowledge preserved
