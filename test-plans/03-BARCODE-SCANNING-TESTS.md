# Barcode Scanning - Comprehensive Test Plan

## Test Overview

**Feature**: Product Barcode Scanning with Nutrition Lookup  
**API**: OpenFoodFacts (Primary), USDA FoodData Central (Secondary)  
**Client-Side**: React Native with Expo Camera  
**Created**: 2025-01-21

---

## Test Environment Setup

### Required Setup

- React Native app running on physical device (barcode scanning requires camera)
- Internet connection (for API calls)
- Test barcode images downloaded locally
- OpenFoodFacts API accessible (no auth required)

### Test Data Requirements

- Barcode samples in various formats:
  - EAN-13 (13 digits) - European products
  - UPC-A (12 digits) - US products
  - EAN-8 (8 digits) - Small products
  - QR codes with product info
- Mix of:
  - Indian products (Parle-G, Maggi, Amul)
  - International products (Nutella, Coca-Cola, Corn Flakes)
  - Healthy products (vegetables, fruits)
  - Unhealthy products (chips, candy, soda)

---

## Test Scenarios

### Scenario 1: Scan Popular Product (Nutella)

**Barcode**: `3017620422003` (EAN-13)  
**Product**: Nutella Hazelnut Spread

**Test Steps**:

1. Open app, navigate to Diet screen
2. Tap "Barcode" quick action
3. Point camera at Nutella barcode or use test image
4. Wait for scan detection (2-second debounce)

**Expected Results**:

- Product recognized: "Nutella"
- Brand: "Ferrero"
- Category: "sweet" or "snack"
- Nutrition per 100g:
  - Calories: ~550 kcal
  - Protein: ~6g
  - Carbs: ~58g
  - Fat: ~31g
  - Sugar: ~56g
- Health score: 20-30 (Poor/Unhealthy)
- Alerts: "High sugar content", "High fat content"
- Image URL present
- Confidence: ≥85%

**Validation Checks**:

- [ ] Barcode format validated (EAN-13)
- [ ] Product name matches
- [ ] Nutrition data complete
- [ ] Health score calculated
- [ ] Product details modal displays
- [ ] "Add to Meal" button functional

---

### Scenario 2: Scan Indian Product (Parle-G Biscuits)

**Barcode**: `8901725118006` (EAN-13)  
**Product**: Parle-G Glucose Biscuits

**Expected Results**:

- Product: "Parle-G" or "Parle Glucose Biscuits"
- Brand: "Parle"
- Category: "snack" or "sweet"
- Calories: ~450 kcal per 100g
- Health score: 40-50 (Moderate)
- Source: OpenFoodFacts or USDA fallback

**Validation Checks**:

- [ ] Indian product recognized
- [ ] Local/regional database support
- [ ] Nutrition data accurate
- [ ] Health assessment appropriate

---

### Scenario 3: Scan Healthy Product (Apple/Vegetable)

**Scenario**: Scan fresh produce barcode (if available)

**Expected Results**:

- Product recognized from database
- Health score: 80-100 (Excellent)
- Benefits highlighted: High fiber, vitamins, low calorie
- Green health indicators
- Recommendations: "Great choice! High in nutrients"

**Validation Checks**:

- [ ] Healthy foods scored appropriately
- [ ] Positive messaging displayed
- [ ] Benefits section populated

---

### Scenario 4: Unknown Barcode (Not in Database)

**Barcode**: `9999999999999` (fake EAN-13)

**Test Steps**:

1. Scan invalid/unknown barcode
2. Check error handling

**Expected Results**:

- Error message: "Product not found in database"
- Suggestion: "Try manual entry or search by name"
- Option to submit product for review
- No app crash

**Validation Checks**:

- [ ] Graceful error handling
- [ ] User-friendly error message
- [ ] Fallback options provided
- [ ] No data corruption

---

### Scenario 5: Multiple Scans (Cache Testing)

**Test Steps**:

1. Scan Nutella barcode
2. Close result modal
3. Scan same barcode again immediately
4. Check cache indicator

**Expected Results**:

- First scan: API call to OpenFoodFacts (~2-3 seconds)
- Second scan: Cached result (< 100ms)
- Cache indicator: "Cached result"
- Identical product data both times

**Validation Checks**:

- [ ] Cache working (LRU, 100 items max)
- [ ] Response time improvement ≥90%
- [ ] Data consistency
- [ ] Recent scans list updated

---

### Scenario 6: Health Score Calculation (Various Products)

| Product        | Barcode       | Expected Score | Category     |
| -------------- | ------------- | -------------- | ------------ |
| Nutella        | 3017620422003 | 20-30          | Unhealthy 🔴 |
| Coca-Cola      | 5449000000996 | 10-20          | Unhealthy 🔴 |
| Corn Flakes    | 5053827154437 | 50-60          | Moderate 🟠  |
| Chicken Breast | N/A           | 85-95          | Excellent 🟢 |
| Almonds        | Varies        | 75-85          | Good 🟡      |

**Health Score Formula**:

```
Base: 100
- High calories (>400/100g): -30 max
- High fat (>20g/100g): -20 max
- High sugar (>15g/100g): -25 max
- High sodium (>1.5g/100g): -20 max
+ High protein (>10g/100g): +15 max
+ High fiber (>5g/100g): +10 max
Final: Clamped 0-100
```

**Validation Checks**:

- [ ] All products scored correctly
- [ ] Category thresholds accurate
- [ ] Color coding matches score
- [ ] Alerts triggered appropriately

---

### Scenario 7: Barcode Formats (All Supported Types)

**Test Different Formats**:

1. **EAN-13** (13 digits): `3017620422003` ✅
2. **UPC-A** (12 digits): `012345678905` ✅
3. **EAN-8** (8 digits): `12345678` ✅
4. **QR Code**: Multi-line product data ✅
5. **Invalid Format**: `ABC123` ❌ (should reject)

**Validation Checks**:

- [ ] All valid formats accepted
- [ ] Invalid formats rejected with error
- [ ] Format detection accurate
- [ ] Expo Camera barcode types configured

---

### Scenario 8: Add to Meal Flow

**Test Steps**:

1. Scan product (Nutella)
2. Review product details
3. Adjust portion (100g → 30g)
4. Tap "Add to Current Meal"
5. Select meal type (breakfast)
6. Confirm addition

**Expected Results**:

- Portion adjustment recalculates nutrition:
  - 100g: 550 kcal
  - 30g: 165 kcal (30% of original)
- Food logged to `meal_logs` table
- `enhancementSource: "barcode"`
- Daily nutrition totals updated
- Success message: "Added to breakfast"

**Validation Checks**:

- [ ] Portion scaling accurate
- [ ] Database insert successful
- [ ] Nutrition totals updated
- [ ] UI refreshes properly

---

## API Integration Testing

### OpenFoodFacts API

**Endpoint**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`

**Test 1: Valid Barcode (Nutella)**

```bash
curl https://world.openfoodfacts.org/api/v0/product/3017620422003.json
```

**Expected Response**:

```json
{
  "status": 1,
  "product": {
    "product_name": "Nutella",
    "brands": "Ferrero",
    "categories": "Chocolate spreads",
    "nutriments": {
      "energy-kcal_100g": 550,
      "proteins_100g": 6.3,
      "carbohydrates_100g": 57.5,
      "sugars_100g": 56.3,
      "fat_100g": 30.9,
      "sodium_100g": 0.107
    },
    "allergens": "nuts, milk",
    "ingredients_text": "Sugar, palm oil, hazelnuts...",
    "image_url": "https://..."
  }
}
```

**Test 2: Invalid Barcode**

```bash
curl https://world.openfoodfacts.org/api/v0/product/9999999999999.json
```

**Expected Response**:

```json
{
  "status": 0,
  "status_verbose": "product not found"
}
```

**Test 3: Network Timeout**

- Simulate slow network
- Expected: Timeout after 10 seconds
- Fallback: Error message, retry option

**Validation Checks**:

- [ ] API response parsed correctly
- [ ] Nutrition data extracted
- [ ] Error handling robust
- [ ] No API key required (free tier)

---

## Camera Integration Testing

### Expo Camera Configuration

**Required Permissions**:

- Camera access (iOS/Android)
- Auto-request on first use
- Handle permission denied

**Camera Settings**:

```typescript
{
  barcodeScannerSettings: {
    barcodeTypes: [
      "qr",
      "ean13",
      "ean8",
      "upc_a",
      "upc_e",
      "code128",
      "pdf417",
    ];
  }
}
```

**Test Cases**:

1. **Permission Granted**
   - Camera preview displays
   - Scanning frame visible
   - Instructions shown

2. **Permission Denied**
   - Error message
   - Link to settings
   - Fallback: Manual entry

3. **Poor Lighting**
   - Flash toggle available
   - Low light warning
   - Still attempts scan

4. **Blurry Image**
   - Auto-focus enabled
   - Instructions: "Hold steady"
   - Retry logic

**Validation Checks**:

- [ ] Permissions handled correctly
- [ ] Camera preview responsive
- [ ] Flash toggle works
- [ ] Barcode detection accurate

---

## Data Flow Validation

### Complete Scan Flow

```
USER TAPS "BARCODE" BUTTON
  ↓
setCameraMode("barcode") + setShowCamera(true)
  ↓
Camera.tsx renders with barcode mode
  ↓
CameraView detects barcode → handleBarcodeScanned(data, type)
  ↓
2-second debounce (prevent multiple scans)
  ↓
validateBarcode(data) → Check format (EAN-13, UPC-A, etc.)
  ↓
lookupProduct(barcode)
  ├─ Check cache → Cache hit? Return immediately
  └─ Cache miss → API call
      ↓
searchByBarcode(barcode) → OpenFoodFacts API
  ↓
Parse response → Extract nutrition, image, allergens
  ↓
calculateHealthScore(nutrition)
  ↓
cacheProduct(barcode, product) → LRU cache (100 items max)
  ↓
Display ProductDetailsModal
  ├─ Product info (name, brand, image, barcode)
  ├─ Health score indicator (circular, color-coded)
  ├─ Nutrition facts grid
  ├─ Health breakdown
  ├─ Alerts & recommendations
  └─ Action buttons (Add to Meal, Close)
  ↓
USER TAPS "ADD TO MEAL"
  ↓
handleAddProductToMeal()
  ├─ Create food entry with barcode
  ├─ Log to meal_logs (enhancementSource: "barcode")
  └─ Refresh daily nutrition
  ↓
SUCCESS MESSAGE + UI UPDATE
```

**Validation Checkpoints**:

- [ ] Each step completes successfully
- [ ] No data loss between steps
- [ ] Error handling at each point
- [ ] Performance acceptable (< 5s total)

---

## UI Component Testing

### ProductDetailsModal

**Components to Test**:

1. **Header Section**
   - [ ] Product image displays (or placeholder)
   - [ ] Product name visible
   - [ ] Brand name visible
   - [ ] Barcode number shown (monospace)

2. **Health Score Indicator**
   - [ ] Large circular score (0-100)
   - [ ] Color-coded by category
   - [ ] Category badge (Excellent/Good/Moderate/Poor/Unhealthy)
   - [ ] Emoji indicator (🟢🟡🟠🔴)

3. **Nutrition Facts Grid**
   - [ ] 7 nutrition cards displayed
   - [ ] Values per 100g shown
   - [ ] Color-coded cards
   - [ ] Units correct (g, mg, kcal)

4. **Health Breakdown**
   - [ ] 4 category scores (Calories, Macros, Additives, Processing)
   - [ ] Each score 0-100
   - [ ] Color indicators

5. **Alerts & Recommendations**
   - [ ] Red alert boxes (high sugar/sodium)
   - [ ] Yellow recommendations
   - [ ] Green benefits list
   - [ ] Orange concerns

6. **Action Buttons**
   - [ ] "Add to Current Meal" functional
   - [ ] "Close" closes modal
   - [ ] Disabled state if guest user

---

## Performance Benchmarks

| Metric                   | Target  | Critical |
| ------------------------ | ------- | -------- |
| Barcode Detection Time   | < 1s    | < 3s     |
| API Response Time        | < 3s    | < 10s    |
| Cache Lookup Time        | < 50ms  | < 200ms  |
| Health Score Calculation | < 10ms  | < 100ms  |
| UI Render Time           | < 500ms | < 2s     |
| End-to-End Flow          | < 5s    | < 15s    |

---

## Test Data Files Needed

Create directory: `test-data/barcode-samples/`

**Download Barcode Images**:

1. `nutella-3017620422003.png` - Nutella barcode
2. `parle-g-8901725118006.png` - Parle-G biscuits
3. `maggi-8901058851496.png` - Maggi noodles
4. `coca-cola-5449000000996.png` - Coca-Cola
5. `corn-flakes-5053827154437.png` - Corn Flakes
6. `red-bull-9002490100070.png` - Red Bull
7. `invalid-9999999999999.png` - Invalid barcode (for error testing)

**Sample API Responses** (for offline testing):

- `responses/nutella-response.json`
- `responses/parle-g-response.json`
- `responses/product-not-found.json`

---

## Test Execution Log

| Test ID     | Status     | Date | Notes           |
| ----------- | ---------- | ---- | --------------- |
| BARCODE-001 | ⏳ Pending |      | Nutella scan    |
| BARCODE-002 | ⏳ Pending |      | Parle-G scan    |
| BARCODE-003 | ⏳ Pending |      | Healthy product |
| BARCODE-004 | ⏳ Pending |      | Unknown barcode |
| BARCODE-005 | ⏳ Pending |      | Cache testing   |
| BARCODE-006 | ⏳ Pending |      | Health scores   |
| BARCODE-007 | ⏳ Pending |      | All formats     |
| BARCODE-008 | ⏳ Pending |      | Add to meal     |

---

## Known Issues

1. **OpenFoodFacts Database**: Not all products available (especially regional)
2. **Camera Performance**: Slower on older devices
3. **Poor Lighting**: Barcode detection fails in low light
4. **QR Code Size**: Very small QR codes may not scan
5. **No Offline Mode**: Requires internet for API calls

---

## Success Criteria

- [ ] All barcode formats supported
- [ ] OpenFoodFacts API integration working
- [ ] Health score calculation accurate
- [ ] Cache functioning (100 items, LRU)
- [ ] Add to meal flow complete
- [ ] UI displays all product data
- [ ] Error handling robust
- [ ] Performance acceptable
