# Visual QA — Achievements Flow (Android emulator, Fast Refresh loop)

**Date:** 2026-07-09
**Device:** emulator-5554 (sniff_avd, SDK 36, 1080×2400, heightScale ≈ 2.817)
**Test user:** `testuser@fitai.dev` / `TestPass12345`
**Method:** ADB screencap + uiautomator dump per screen; fix in source; verify via Fast Refresh. No APK rebuild (pre-built `app-debug.apk` installed once via `pm install`; iteration via Fast Refresh only).
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` (FOCUS 1, screen inventory "Achievements")

---

## 0. Hot-Reload Loop Verification

| Check | Result |
|---|---|
| Metro | HTTP 200, `packager-status:running` (started fresh this session) |
| Emulator | `emulator-5554` (sniff_avd) — cold-booted (44s to `sys.boot_completed=1`) |
| adb reverse | `tcp:8081 tcp:8081` set |
| Fast Refresh | ON (dev menu confirmed) |
| App package | `com.fitai.app.dev` (debug APK, 253MB, Jun 30 build) |
| Deep-link relaunch | `exp+fitai://expo-development-client/?url=http://localhost:8081` — works |
| Dump method | `adb exec-out uiautomator dump /dev/tty` (avoids Git Bash MSYS path-mangling) |

**Loop ALIVE.** Note: dev-launcher screen appeared on first launch; tapped dev-menu "Reload" to load the actual app bundle.

---

## 1. Screen Picked — Achievements

**Why:** Per the spec's screen inventory, Achievements ("cards, progress bars, locked/unlocked") was flagged in `visual-qa-profile.md` as "minimal implementation (no cards/progress bars)" showing only an `Alert.alert`. That report never drove the FULL `AchievementsScreen` (a separate screen reached via Home → "View all achievements"). The full screen + its `AchievementDetailModal` had NOT been driven or bounds-verified. It is self-contained, NOT a BottomSheet consumer (uses a plain RN `<Modal>`), so the a11y bridge stall does not block verification.

**Scope driven:**
- Home tab → AchievementShowcase preview (badges, "View all achievements" CTA)
- Full `AchievementsScreen` (stats banner, category tabs, SectionList of Unlocked/Locked cards)
- `AchievementDetailModal` for an UNLOCKED achievement ("On The Scale")
- `AchievementDetailModal` for a LOCKED achievement ("Early Bird")
- Scrolled SectionList (off-screen cards brought into view)
- Category tabs (All/Fitness/Nutrition/Wellness/Streak/Milestones — horizontal scroll)

---

## 2. Screens Captured (screenshot + dump per screen)

| # | Screen | Screenshot | Dump | Dump bytes | Notes |
|---|--------|-----------|------|-----------|-------|
| 00 | Dev-launcher (initial) | `achv-00-launch.png` | `achv-00-launch.xml` | 23997 | Expo dev-launcher; tapped Reload |
| 03 | Welcome | `achv-03-reloaded.png` | `achv-03-reloaded.xml` | 17398 | Get Started / Sign In / Continue as Guest |
| 04 | Sign In | `achv-04-signin.png` | `achv-04-signin.xml` | — | Entered testuser@fitai.dev |
| 06 | Home (post-login) | `achv-06-postlogin.png` | `achv-06-postlogin.xml` | — | 5 tabs visible |
| 07 | Profile tab | `achv-07-profile.png` | `achv-07-profile.xml` | — | "1 Achievements" stat visible |
| 08 | Home tab | `achv-08-home.png` | `achv-08-home.xml` | — | Greeting, cards |
| 09 | Home (scrolled) | `achv-09-home-scrolled.png` | `achv-09-home-scrolled.xml` | — | AchievementShowcase: On The Scale + 4 locked badges |
| 10 | AchievementsScreen (full) | `achv-10-fullscreen.png` | `achv-10-fullscreen.xml` | 87003 | Unlocked(1) + Locked(30) sections, stats banner, tabs |
| 11 | Detail modal (BEFORE fix) | `achv-11-detailmodal.png` | `achv-11-detailmodal.xml` | 11940 | **DEFECT A** — 8 inverted bounds |
| 13 | Detail modal (AFTER fix, unlocked) | `achv-13-detail-fixed.png` | `achv-13-detail-fixed.xml` | 11940 | 0 inverted — fix confirmed |
| 14 | Detail modal (locked, Early Bird) | `achv-14-locked-detail.png` | `achv-14-locked-detail.xml` | — | 0 inverted — fix confirmed |
| 15 | SectionList (scrolled) | `achv-15-scrolled.png` | `achv-15-scrolled.xml` | — | 0 inverted — off-screen cards valid when scrolled |
| 17 | Nutrition tab (tap) | `achv-17-nutrition.png` | `achv-17-nutrition.xml` | — | Tap opened card not filter (tab bounds issue — see DEFECT B) |
| 19 | Detail modal (final re-verify) | `achv-19-final-verify.png` | `achv-19-final-verify.xml` | — | 0 inverted — fix stable |

---

## 3. Defects Found

### DEFECT A — AchievementDetailModal: REWARDS + Unlocked content inverted/clamped bounds (FIXED)

**Screen:** AchievementsScreen → tap any achievement card → `AchievementDetailModal`
**Evidence (bounds, BEFORE fix — `achv-11-detailmodal.xml`):**
Content below the "REQUIREMENTS" header collapsed to y2=1313 (clamped), producing inverted bounds (y1 > y2):
- Requirements row container: `[42,1286][95,1313]` (y1=1286 < y2=1313 OK, but content below clamps)
- `REWARDS` header: `[42,1373][1038,1313]` — **INVERTED** (y1=1373 > y2=1313)
- reward icon: `[42,1383][49,1313]` — **INVERTED**
- "50 FitCoins" reward text: `[54,1383][83,1313]` — **INVERTED**
- reward description container: `[42,1397][1038,1313]` — **INVERTED**
- unlocked-container parent: `[31,1423][1048,1313]` — **INVERTED**
- trophy icon: `[492,1431][545,1313]` — **INVERTED**
- "Unlocked on 6/22/2026" text: `[550,1456][587,1313]` — **INVERTED**

8 inverted nodes total. The REWARDS section + Unlocked container were laid out at y=1373–1456 but clamped to y2=1313, so all bounds inverted.

**Root cause:** `modalContent` style used `maxHeight: rh(70)`. `rh(70)` = `70 × (2400/852)` ≈ **197px** — far too small to contain the modal content (~500px: header + icon + title + tier badge + description + REQUIREMENTS section + REWARDS section + progress/unlocked). The `maxHeight` clamped the modal content height, and the inner `ScrollView` (with `flexGrow: 0`) could not measure/expand the lower content, so the a11y service reported inverted bounds for everything below the clamp boundary.

This matches the spec's "negative/inverted bounds" defect category (caused by too-small maxHeight + content not measuring fully). The codebase's other detail modals use far larger maxHeight values:
- `RecoveryTipsModal.tsx:385` → `maxHeight: rh(400)`
- `BMRInfoModal.tsx:245` → `maxHeight: rh(400)`
- `LogMealModal.tsx:1069` → `maxHeight: rh(500)`
- `WeightEntryModal.tsx:432` → `maxHeight: rh(350)`

`rh(70)` was a clear outlier (10–20× too small).

**Fix applied:** `src/components/achievements/AchievementDetailModal.tsx:206`
```diff
   modalContent: {
     width: "100%",
-    maxHeight: rh(70),
+    maxHeight: rh(400),
     backgroundColor: colors.backgroundTertiary,
```
Changed `rh(70)` (≈197px) → `rh(400)` (≈1127px), matching the established detail-modal pattern (`RecoveryTipsModal`, `BMRInfoModal` both use `rh(400)`). This gives the ScrollView room to measure the full content without clamping. Aurora tokens only; no hardcoded values; no new deps; no `Alert.alert`; no `console.log`; matches sibling-modal style.

**Verification (AFTER fix — `achv-13-detail-fixed.xml`):**
All previously-inverted nodes now have valid bounds (y1 < y2):
- `REWARDS` header: `[42,1283][1038,1288]` — valid (was `[42,1373][1038,1313]` INVERTED)
- reward icon: `[42,1293][49,1302]` — valid (was `[42,1383][49,1313]` INVERTED)
- "50 FitCoins": `[54,1293][83,1302]` — valid (was `[54,1383][83,1313]` INVERTED)
- reward description: `[42,1307][1038,1312]` — valid (was `[42,1397][1038,1313]` INVERTED)
- unlocked-container: content at `[492,1341][545,1396]` — valid (was `[492,1431][545,1313]` INVERTED)
- "Unlocked on 6/22/2026": `[550,1366][587,1371]` — valid (was `[550,1456][587,1313]` INVERTED)

**Total inverted bounds: 8 → 0.** Content now fully measures and renders. The modal grew taller (icon shifted y=1170→1080) to accommodate the full content.

**Cross-check (locked achievement, `achv-14-locked-detail.xml`):** "Early Bird" locked modal — 0 inverted bounds. REWARDS section `[42,1319][1038,1324]` valid, "75 FitCoins" `[54,1329][83,1338]` valid. Fix holds for both unlocked and locked achievement states.

### DEFECT B — Category tab text bounds extremely thin (height ~9px) — NOT FIXED (cosmetic, a11y-only)

**Screen:** AchievementsScreen → AchievementCategoryTabs (All/Fitness/Nutrition/Wellness/Streak/Milestones)
**Evidence (`achv-16-top.xml`):**
- "All" text: `[24,285][32,294]` — 8×9px
- "Fitness" text: `[63,285][82,294]` — 19×9px
- "Nutrition" text: `[114,285][137,294]` — 23×9px

The tab TEXT nodes report only ~9px height. The tab container itself has `minHeight: rp(44)` (≈44px) so the tabs ARE tappable, but the thin text bounds mean a tap at the text center (e.g. 125,289) sometimes hits the card BELOW the tab row instead (observed: tapping "Nutrition" opened the "On The Scale" detail modal instead of filtering). The horizontal ScrollView + `alignItems: "center"` on `scrollContent` may be collapsing the text measurement.

**Severity:** P2 (cosmetic / minor a11y — the tabs work if tapped on the container area above/below the thin text, but a11y tools and precise taps may miss). Not blocking.
**Status:** NOT FIXED — out of scope for this fix loop (the primary defect A is the P1). Flagged for a follow-up: investigate `AchievementCategoryTabs` `scrollContent` `alignItems` / tab `paddingVertical` to ensure the text node measures the full tab height.

---

## 4. Items Checked, No Defect

- **AchievementsScreen full tree (87003 bytes):** Rich a11y tree — Unlocked section (1 card), Locked section (30 cards), stats banner (Earned/Complete/FitCoins), category tabs. 0 inverted bounds in the list view itself.
- **SectionList off-screen cards (`achv-15-scrolled.xml`):** 0 inverted when scrolled into view — the logcat "Skipping invisible child" entries (y1>y2=2272) are expected Android ScrollView behavior for off-screen content (same as PaywallModal per `visual-qa-profile.md`). NOT a bug.
- **AchievementShowcase on Home (`achv-09-home-scrolled.xml`):** Preview cards render. "Unbreakable" badge `[1004,784][992,1001]` shows x1>x2 (inverted width) — but this is the 4th badge in a horizontal row pushed off-screen (expected, same ScrollView pattern). When the showcase is scrolled, it becomes valid.
- **Alert.alert violation:** `visual-qa-profile.md` noted the Profile stat-tap used `Alert.alert`. CONFIRMED ALREADY FIXED — `useProfileLogic.ts:382` `showAlert` delegates to `crossPlatformAlert`. No regression.
- **Detail modal Close button:** `[933,1062][1049,1178]` (87×116px) — valid, tappable, closes the modal.
- **Detail modal backdrop tap:** Tapping outside modal content closes it (TouchableOpacity backdrop with `onPress={onClose}`).
- **Refresh (pull-to-refresh):** `RefreshControl` wired to `handleRefresh` → `initialize(userId)`. Not explicitly tapped but handler present.
- **No console.log in prod paths:** `AchievementsScreen.tsx:185` uses `console.error` (legitimate error logging, Principle 5 compliant). `useWorkoutAchievements.ts` uses `console.error` in catch blocks (compliant).
- **No `Alert.alert`:** Achievements flow uses `AchievementDetailModal` (RN Modal) + toasts. No `Alert.alert` introduced.
- **No hardcoded colors/spacing:** Fix uses `rh()` responsive token. Modal styles use `colors.*` aurora tokens throughout.

---

## 5. Deferred

1. **DEFECT B (category tab thin text bounds):** Cosmetic a11y issue in `AchievementCategoryTabs.tsx`. Not blocking; flagged for follow-up.
2. **Detail modal progress bar for in-progress achievements:** Could not exercise — test user has no in-progress achievements (only 1 unlocked, 30 locked at 0%). Would need a user with partial progress to verify the progress bar + "Current Progress" section bounds.
3. **Celebration overlay (`AchievementCelebration.tsx`):** Not triggered (only fires on new achievement unlock during a workout). Out of scope for static screen QA.

---

## 6. Summary

| Category | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Inverted/negative bounds (detail modal) | 1 (8 nodes) | 1 | 0 |
| Thin tab text bounds (cosmetic) | 1 | 0 | 1 |
| Screens driven | 9+ | — | — |

### Files Modified (no commit)
1. `src/components/achievements/AchievementDetailModal.tsx:206` — `maxHeight: rh(70)` → `rh(400)` (fixes inverted/clamped bounds for REWARDS + Unlocked content)

### Gates
- **TypeScript:** `npx tsc --noEmit` → exit 0 ✅
- **Jest:** `npx jest` → 471 passed, 9 skipped, 87 suites passed ✅ (≥471 / 87 required)
- **Expo export:** `npx expo export --platform android` → exit 0 ✅

### Artifacts
All under `D:/FitAi/FitAI/.maestro-artifacts/` (screenshots `achv-*.png`, dumps `achv-*.xml`, `achv-logcat.txt`). Screenshots NOT read (binary) — viewable by the user.

### Notes
- The Achievements screen is a FULL implementation (not the "minimal" version the prior profile report saw — that report only observed the Profile-tab stat-tap alert, which is a different, already-fixed code path). The full screen has cards, progress bars, tier badges, locked/unlocked sections, category tabs, and a detail modal.
- The detail modal uses a plain RN `<Modal>` (NOT BottomSheet), so the known `bottomsheet-uiautomator-stall` did NOT block verification. All dumps succeeded.
