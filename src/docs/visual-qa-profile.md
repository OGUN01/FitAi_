# Visual QA Report — Profile/Settings/Analytics/Achievements/Paywall

**Date:** 2026-06-23  
**Agent:** Visual-QA + Hot-Reload Fix Loop  
**Device:** emulator-5554, 1080x2400, SDK 36  
**Method:** uiautomator XML + bounds analysis (no image reads)

---

## Screens Driven

### 1. Profile Tab
- **Screenshot:** `.maestro-artifacts/prof-profile2.png`
- **Dump:** `prof-profile2.xml` (49042 bytes)
- **Findings:** Clean. All stat cards (Day Streak, Workouts, Calories, Best Streak, Achievements) have valid bounds, clickable=true. Account section rows (Personal Information, Goals & Preferences, Body Measurements, Manage Subscription) all valid bounds, no overlap, no truncation. Test User name, "Member for 1 day" visible.
- **Issues:** None.

### 2. Personal Info Edit Modal
- **Screenshot:** `.maestro-artifacts/prof-personalinfo-fixed.png`
- **Dump:** `pi-fix.xml`
- **Issues Found + Fixed:**
  - **BUG:** Save Changes button had inverted bounds `[371,2390][421,2337]` (y1>y2, negative height). Root cause: `SettingsModalWrapper` footer used `SlideInUp` entering animation which transiently inverts bounds during slide, AND footer container lacked minHeight to accommodate the button (button ~52px, footer only 37px).
  - **FIX:** `src/screens/main/profile/components/SettingsModalWrapper.tsx`:
    - Line 156: Changed `SlideInUp.delay(300).duration(400)` → `FadeIn.delay(300).duration(400)` (eliminates transient inverted bounds during slide-up animation)
    - Line 268: Added `minHeight: rh(76)` to `footer` style (ensures footer container accommodates the Save button)
  - **Verification:** After Fast Refresh, Save button bounds `[42,2280][1038,2337]` — valid (y1<y2), no inverted bounds anywhere in modal. EditText fields (Full Name, Age) accessible and clickable. Gender/Activity Level pickers render correctly.

### 3. Goals & Preferences Edit Modal
- **Screenshot:** `.maestro-artifacts/prof-scroll.png` (scrolled state)
- **Dump:** `prof-scroll.xml`
- **Findings:** Clean. Uses same `SettingsModalWrapper` (fix applies). Primary Goals (Weight Loss, Muscle Gain, Endurance, Strength, Flexibility, General Fitness), Experience Level (Beginner/Intermediate/Advanced), Time Per Workout (15-30/30-45/45-60/60+ min) all render. Save button bounds `[42,2280][1038,2337]` valid. No inverted bounds.

### 4. Settings / Preferences Section
- **Screenshot:** `.maestro-artifacts/prof-settings.png`
- **Dump:** `settings.xml`
- **Findings:** PREFERENCES section: Notifications (enabled, clickable), Theme (disabled — "Dark theme only"), Units (enabled, clickable), Language (disabled — "English only for now"). APP section: Help & Support, About FitAI. DATA section: Connect Wearables, Export Data, Sync Settings, Clear Cache. All rows valid bounds, no overlap. Theme/Language disabled by design (not yet implemented).

### 5. Units Selection Modal (SettingsSelectionModal)
- **Screenshot:** `.maestro-artifacts/prof-settings.png`
- **Dump:** `units.xml` (before fix)
- **Issues Found + Fixed:**
  - **BUG:** All elements below header had inverted bounds (y2=697 clamped to header bottom, y1 extending to 2238). RadioButton, Metric label, Kilograms description all inverted. Root cause: `dialogContainer` had no height constraint, GlassCard with `overflow:"hidden"` clipped accessibility bounds.
  - **FIX:** `src/screens/main/profile/modals/SettingsSelectionModal.tsx`:
    - Line 210: Added `maxHeight: "80%"` to `dialogContainer` style
  - **Note:** The GlassView `flex:1` → `flexShrink:0` change was tested but reverted (broke SettingsSection row touch handling). The `maxHeight` on dialogContainer is the correct fix.

### 6. Analytics Tab
- **Screenshot:** `.maestro-artifacts/prof-analytics.png`
- **Dump:** `analytics2.xml`
- **Findings:** Premium-gated screen ("Detailed analytics and trend charts are available on Basic and Pro plans", "Upgrade to Unlock"). Upgrade button `[289,1337][791,1477]` tappable. No inverted bounds. **authUtils/AnalyticsEngine crash confirmed gone** — no FATAL/crash in logcat.

### 7. Achievements
- **Dump:** `achv.xml`
- **Findings:** Shows native Alert.alert dialog: "1 achievement earned. Keep going!" with OK button `[810,1261][978,1403]`. Minimal implementation (no cards/progress bars). Bounds valid. NOTE: Uses `Alert.alert` directly — should use `crossPlatformAlert` per project rules, but this is a pre-existing issue not in scope.

### 8. Progress Tab
- **Status:** Deferred — no separate Progress tab in the tab bar. Body Measurements accessible via Profile > Body Measurements (uses same SettingsModalWrapper, fix applies).

### 9. Onboarding Flow
- **Status:** Deferred — requires fresh sign-up (would pollute Supabase with throwaway accounts). testIDs were added in a prior session but aren't reachable without a new account.

---

## Deferred Prior Issues

### ExerciseGifPlayer Info Chips
- **Issue:** "Equipment"/"Target" info chips rendered with negative-height bounds (inverted y1/y2).
- **Root Cause:** `container` style had `overflow: "hidden"` which clipped the Card content, causing the info chips below the GIF to have inverted accessibility bounds.
- **FIX:** `src/components/fitness/ExerciseGifPlayer.tsx`:
  - Line 364: Removed `overflow: "hidden"` from `container` style
- **Verification:** Could not fully verify on-device (got stuck on SubscriptionManagement screen during navigation), but the source fix eliminates the clipping constraint. The `gifContainer` retains its own borderRadius for visual effect.

### Paywall BottomSheet Pricing Card
- **Issue:** Pricing card had negative/inverted bounds; entire PaywallModal accessibility tree was EMPTY (2889 bytes = root node only).
- **Root Cause:** `PaywallModal` container used `maxHeight: "92%"` (percentage-based). On Android, percentage-based maxHeight in a flex-end positioned Modal causes the accessibility service to fail measuring children — the ENTIRE modal content becomes invisible to uiautomator.
- **FIX:** `src/components/subscription/PaywallModal.tsx`:
  - Line 13: Added `rh` to responsive imports
  - Line 374: Changed `maxHeight: "92%"` → `maxHeight: rh(2208)` (absolute pixel value, 92% of 2400px screen height)
  - Line 375: Changed `minHeight: 420` → `minHeight: rh(420)` (height-based responsive scaling)
- **Verification:** After fix, PaywallModal a11y tree populated (16344 bytes). All plan cards (Free Plan, Pro Plan), pricing (₹0, ₹5/mo), features, Subscribe button, Monthly/Yearly toggle visible to accessibility. Remaining "inverted" bounds are just off-screen ScrollView content (expected Android behavior — verified by scrolling: Pro Plan card bounds become valid when scrolled into view).
- **Also fixed:** SubscriptionManagement screen a11y tree was also empty (same percentage-maxHeight issue in the parent). After fix, full screen accessible (31787 bytes).

---

## Summary

| Category | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Inverted/negative bounds | 3 | 3 | 0 |
| Empty a11y tree | 2 | 2 | 0 |
| Missing buttons | 0 | — | — |
| Overlap/truncation | 0 | — | — |
| Screens driven | 7 | — | 2 (Progress, Onboarding) |

### Files Modified
1. `src/screens/main/profile/components/SettingsModalWrapper.tsx` — SlideInUp→FadeIn + footer minHeight
2. `src/screens/main/profile/modals/SettingsSelectionModal.tsx` — dialogContainer maxHeight
3. `src/components/subscription/PaywallModal.tsx` — percentage→absolute maxHeight/minHeight
4. `src/components/fitness/ExerciseGifPlayer.tsx` — removed overflow:hidden from container

### Gates
- **TypeScript:** `npx tsc --noEmit` → 0 errors ✅
- **Jest:** `npx jest` → 471 passed, 9 skipped, 87 suites passed ✅ (≥471 required)

### Notes
- Emulator experienced CPU/memory pressure during session (ANR in com.android.phone, 99% CPU). Required multiple app restarts.
- The `GlassView` content `flex:1` → `flexShrink:0` change was tested and REVERTED — it broke SettingsSection row touch handling (rows became unresponsive). The correct fix for the Units modal was `maxHeight` on `dialogContainer`.
- Achievements dialog uses `Alert.alert` directly (should use `crossPlatformAlert`) — pre-existing, noted but not fixed.

---

## 2026-08-29 — Profile IA/contrast/layout pass

**Source:** device screenshots from a live Expo Go dev bundle reported vertically-stacked settings rows, mis-aligned chevrons, low-contrast text, a clashing white Google badge / gold subscription square, duplicate category labels, and dead Theme/Language rows. No physical device was available in this session (`mobile_list_available_devices` → `[]`), so this pass is source-verified only; on-device confirmation with `mcp__mobile-mcp__*` is still owed.

**Reproduction note:** the reported vertical stacking is not reproducible from source — every row container already declares `flexDirection: "row"` (`SettingsSection.tsx`, `ConnectedAccountsCard.tsx`, `ProfileStats.tsx`). The most likely mechanism is `rf()` (`src/utils/responsive.ts`) **dividing** by `PixelRatio.getFontScale()` while `typography.variants.*` text scales the opposite way (RN's own scaling on top of raw tokens) — icon and text sizes move in opposite directions as the device text-size setting changes, badly distorting row proportions without literally reflowing them to a column. Fixed by switching every settings-row icon (Ionicons + the Google "G") from `rf()` to `rs()`, which scales on the min screen dimension and does not divide by font scale.

**⚠️ Standing regression re-landed, not yet re-reverted:** the working tree still carries an uncommitted change to `src/components/ui/aurora/GlassView.tsx` that removes `flex: 1` from `contentFront` (replaced with an opt-in `fillHeight` prop). This is functionally the same change the `2026-06-23` entry above records as tested-and-reverted for breaking `SettingsSection` row touch handling. `SettingsSection` itself no longer nests in `GlassCard`/`GlassView` (verified — it renders a plain `View`), so it isn't at risk this time, but `src/components/help/ResourceItem.tsx` and any other `GlassCard` consumer not passing `fillHeight` may collapse. **Check Profile → Help & Support on next device pass; if rows are collapsed, pass `fillHeight` at that call site rather than re-reverting GlassView.**

**Fixes applied (source-only, unverified on device):**
1. `SettingsSection.tsx` / `ConnectedAccountsCard.tsx` — explicit `flexGrow:0/flexShrink:0/flexBasis:"auto"` on every icon/chevron/badge/toggle so a Yoga miscalculation can't collapse them into a column; row metrics unified (64 minHeight, 18/16 padding) between the two lists; dividers switched from a `borderBottom` on the row (which would shift row content if inset) to a separate absolutely-positioned inset line starting after the icon squircle.
2. Removed the dead `theme`/`language` rows (`disabled: true` + `showChevron: false` made their tap handlers unreachable dead code) and the `rowDisabled: { opacity: 0.5 }` double-dim stacked on already-dim token text colors (~2.4:1 effective — WCAG AA failure).
3. Rest Timer now renders a native `Switch` (new `SettingItem.toggle`) instead of a silently-chevronless tappable row.
4. Dropped the per-item ad-hoc hex icon tints (`#FF6B35`, `#00BCD4`, `#9C27B0`, …) for one neutral `surface[2]` squircle + full-contrast glyph across every row; dropped the gold `LinearGradient` premium square in favor of the same neutral squircle with a gold glyph; Google's connected-account badge moved off `#FFFFFF` onto `surface[2]` for the same reason.
5. Removed the uppercase section header from both `SettingsSection` and `ConnectedAccountsCard` — it duplicated the quick-jump chip row above it. Chips are now the single source of each section's label; added an "Accounts" chip (previously unlabelled) and a right-edge fade so the trailing chip reads as scrollable instead of cut off.
6. `ProfileHeader` lost its opaque `surface[0]` background (was painting over the animated `AuroraBackground`, forming a hard seam at the header's bottom edge) and its raw `paddingTop: spacing.lg` became `rp()`-scaled.
7. Removed `ProfileScreen`'s separate `bottomSpacing` spacer View + `paddingBottom: rh(40)` (~140px combined, unique to this tab) in favor of a single `paddingBottom: rh(120)`, matching Home/Progress.

**Files touched:** `SettingsSection.tsx`, `ConnectedAccountsCard.tsx`, `ProfileScreen.tsx`, `useProfileLogic.ts`, `ProfileHeader.tsx`, `LogoutButton.tsx`, `useProfileLogic.test.tsx`, `ProfileHeader.test.tsx` (added `rs` to its `responsive` mock).

**Gates:** `npx tsc --noEmit` → 0 errors. `npx jest` → 1093 passed, 9 skipped (baseline was 471 in the prior pass — suite has grown substantially since); the sole failure (`subscriptionStore.test.ts`, a billing-month-boundary test) reproduces identically on an unmodified tree and is unrelated to this change.

**Still owed:** on-device verification via `mcp__mobile-mcp__*` — element-bounds check that rows share one horizontal band, screenshots at top/mid/bottom scroll, the Help & Support `fillHeight` check above, and a large/small system-text-size pass to confirm the `rf()`→`rs()` icon fix actually resolves the original report.
