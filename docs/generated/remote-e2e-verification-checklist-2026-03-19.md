# FitAI Remote E2E Verification Checklist

Date: 2026-03-19

Scope:
- login and session handling
- subscription lifecycle and payment verification
- admin config / feature flags
- limit enforcement

## 1. Login And Session

- Log in with a valid user and confirm the app restores the session after restart.
- Revoke the user session in Supabase, restart the app, and confirm the app does not keep showing a valid logged-in state indefinitely.
- Log out on a shared device and confirm old onboarding, offline, and sync data do not reappear in guest mode.
- Sign in to the admin app with a real admin and confirm dashboard access works.
- Remove that user from `admin_users`, refresh the admin app, and confirm access is denied without waiting for a token refresh.

## 2. Subscription Creation And Payment

- As a free user, open the paywall and confirm live admin-configured prices are shown.
- Create one monthly paid subscription and confirm duplicate taps do not create overlapping checkout flows.
- Complete payment and confirm the client enters the post-payment processing state, then transitions to premium without requiring a manual app restart.
- Replay the same payment verification payload and confirm the backend rejects or ignores it instead of re-authenticating the row.
- Attempt to create another subscription while a non-terminal one exists and confirm the backend blocks it.

## 3. Webhooks And Lifecycle

- Trigger `subscription.activated` and confirm the latest local row updates by `id`.
- Replay the same webhook event id and confirm it is treated as already processed.
- Send an older webhook after a newer one and confirm it is ignored as stale.
- Pause a subscription, refresh the app, and confirm the paused state remains visible with a resume path.
- Resume and cancel flows should update both the backend row and the profile subscription UI correctly.

## 4. Feature Flags

- Disable `feature_analytics` and confirm:
  - analytics tab disappears in the app
  - direct analytics requests to the worker are rejected
- Disable `feature_ai_chat` and confirm:
  - chat requests and history endpoints are rejected by the worker
  - the client surfaces a clear unavailable message
- Disable `feature_food_contributions` and confirm:
  - unknown-barcode contribution flow is blocked in the app
  - the user sees a disabled-feature message instead of the form

## 5. Limits And Usage

- On free tier, consume the allowed monthly AI generation quota and confirm the next request is blocked.
- On paid tier, confirm configured daily/monthly limits match admin plan settings.
- Force a worker-side limit increment failure and confirm the protected request is rejected instead of succeeding without usage being recorded.
- Perform a plain barcode lookup that does not hit the worker and confirm local quota is not decremented.
- Verify usage state after app restart to confirm persisted client counters still align with backend status.

## 6. Admin Config And Plans

- Change a public app-config key and confirm the mobile app updates without a fresh install.
- Edit nullable plan fields to blank and confirm they persist as `NULL`.
- Toggle `unlimited_ai`, `unlimited_scans`, `analytics`, `coaching`, and `active` in the admin plans UI and confirm the worker and app respect the updated values.
- Update a bad config key through the admin API and confirm it returns `404` instead of a false success.

## 7. Smoke Regression

- `npm test -- auth.middleware.test.ts subscription.regression.test.ts subscription.test.ts subscriptionGate.test.ts` in `fitai-workers`
- `npm test -- --runInBand src/__tests__/services/authCleanup.test.ts src/__tests__/services/auth.sessionLifecycle.test.ts src/__tests__/utils/clearUserData.test.ts src/__tests__/hooks/useAppConfig.test.tsx`
- `npm run type-check`
- `npm run build` in `fitai-admin`
