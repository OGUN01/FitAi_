# UI-Backend Gap Fixes - Architectural Decisions

## Timestamp: 2026-02-06

### Decision Log

#### Decision 1: Remove vs Implement Placeholder Features

**Context**: Progress Photos and Sleep Tracking show "Coming Soon" alerts  
**Options**:

- A) Remove from UI entirely
- B) Implement full features

**Decision**: Remove from UI (Option A)  
**Rationale**:

- No backend implementation exists
- User selected "Fix Everything" - implies removing broken/incomplete UI
- Keeps UI honest - only show working features
- Can re-add later when backend is ready

**Alternative Path**: If user wants these features implemented, create separate feature requests after gap fixes complete.

---

#### Decision 2: Social Features Handling

**Context**: Social achievement badges exist in backend, unclear if social features planned  
**Options**:

- A) Remove social achievement badges
- B) Implement full social features
- C) Keep backend, hide from UI

**Decision**: PENDING investigation (Task 2.3)  
**Next Step**: Research social features scope, then decide

---

#### Decision 3: Profile Stat Click Handlers

**Context**: Stats show onPress handlers that only console.log()  
**Options**:

- A) Remove onPress entirely (make non-clickable)
- B) Implement stat detail modals

**Decision**: PENDING user preference  
**Recommendation**: Remove (Option A) for quick fix  
**If user wants stat details**: Create separate feature task

---

#### Decision 4: Achievement Browser Design

**Context**: Need to create UI for browsing all achievements  
**Approach**:

- Tab-based navigation by category
- Grid view for achievement cards
- Show locked/unlocked states
- Progress bars for incomplete achievements
- Detail modal on tap

**Rationale**: Matches existing FitAI UI patterns (modular components, card-based design)

---

_Decisions will be added as tasks progress._


## Decision: Social Features Status Investigation (COMPLETED)

**Investigation Date**: February 6, 2026

### Evidence Found:

#### 1. Social Achievements System (FULLY IMPLEMENTED - Backend)
- File: src/services/achievements/consistencyBadges.ts, Lines: 254-471
- Finding: Complete createSocialAchievements() function with 12 social achievement badges
- Badges: social_butterfly, squad_leader, community_champion, motivator, encourager, inspiration, challenge_creator, workout_buddy, team_player, leaderboard_star (PLATINUM), mentor, viral_star (LEGENDARY)

#### 2. Achievement Engine Integration (ACTIVE)
- File: src/services/achievements/core.ts, Lines: 15, 54, 245
- Finding: createSocialAchievements() is actively imported and registered
- Status: Social achievements ARE being created and tracked

#### 3. Social Tracking Infrastructure (IMPLEMENTED)
- File: src/stores/achievement/tracking.ts, Lines: 47-56
- Finding: Complete socialInteraction() tracking with friendsCount, kudosGiven, kudosReceived, challengesWon
- Status: Backend ready to track all social metrics

#### 4. UI for Social Features (NONE FOUND - Critical Gap)
- Searched: All screens and components directories
- Finding: ZERO UI components for friend management, leaderboards, kudos, challenges, social feed
- Only Social UI: AboutFitAISocialButtons.tsx - External social media links (NOT internal features)

#### 5. Leaderboard (SINGLE BADGE REFERENCE ONLY)
- File: src/services/achievements/consistencyBadges.ts, Lines: 412-431
- Finding: Only ONE reference - leaderboard_star badge
- Missing: No actual leaderboard implementation, no UI, no ranking logic

### Analysis:

Over-ambitious backend planning with zero frontend implementation:
- 12 social achievement badges exist (all tiers)
- Complete tracking infrastructure exists
- Active registration in achievement engine
- ZERO user-facing UI for any social feature
- Users can NEVER unlock these achievements (no friend system, no kudos, no leaderboard)
- These badges are UNREACHABLE in current implementation

### Recommendation: REMOVE Social Achievement Badges

#### Rationale:
1. User Frustration: 12 badges users can NEVER unlock creates confusion
2. Misleading: Having badges for non-existent features is deceptive
3. Technical Debt: Maintaining unused badges adds complexity
4. Clean System: Better to have 100% achievable badges
5. Future Flexibility: Easy to re-enable when features are implemented

#### Alternative Options Rejected:
- Option A (Implement Features): Requires 40-60 hours, no evidence this is planned
- Option B (Keep Hidden): Already registered in engine, will show as incomplete

### Implementation Plan:
1. Comment out line 54 in src/services/achievements/core.ts
2. Update achievement stats to exclude social category (line 245)
3. Add documentation comment explaining why disabled
4. Keep function intact for future use

### Impact:
- Before: 100+ achievements, 12 unreachable (12% frustration)
- After: ~88 achievements, 0 unreachable (0% frustration)
- Users can achieve 100% completion
- Easy to re-enable by uncommenting one line

### Final Decision:
- REMOVE social badges from active system (comment out registration)
- KEEP createSocialAchievements() function for future
- ADD clear documentation comments
- UPDATE achievement category tracking

---

