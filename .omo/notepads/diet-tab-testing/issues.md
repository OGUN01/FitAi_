# Diet Tab Testing Issues - 2026-03-02

## Issue 1: CORS on in.openfoodfacts.org (NEW)
- **Severity**: Medium
- **Description**: The India-specific Open Food Facts API (`in.openfoodfacts.org`) blocks requests from localhost with CORS
- **Error**: "Access to fetch at 'https://in.openfoodfacts.org/...' blocked by CORS policy"
- **Impact**: Indian barcode lookups may fail silently when world.openfoodfacts.org returns 404
- **Fix suggestion**: Route through the Cloudflare Worker proxy (like the upcitemdb fix), or catch the CORS error gracefully

## Issue 2: Inconsistent Auth Messaging
- **Severity**: Low
- **Description**: "Generate weekly plan" says "Sign In Required" while "Generate daily plan" says "Sign Up Required"
- **Impact**: Minor UX inconsistency

## Issue 3: Recipes Feature Not Connected to Backend
- **Severity**: Info
- **Description**: The Recipes "Create Recipe" button shows "Feature Not Available" regardless of auth state
- **Message**: "AI recipe generation is currently disabled. This feature will be available when the backend integration is complete."
- **Impact**: Feature exists in UI but is non-functional
