# Profile Editing System - Quick Reference

## 🚀 Quick Start Guide

### Basic Setup
```typescript
// 1. Wrap your app with EditProvider
import { EditProvider } from './contexts/EditContext';

function App() {
  return (
    <EditProvider
      onEditComplete={() => console.log('Edit completed')}
      onEditCancel={() => console.log('Edit cancelled')}
    >
      <YourApp />
    </EditProvider>
  );
}
```

### Using Edit Context
```typescript
// 2. Use edit context in components
import { useEditContext } from './contexts/EditContext';

function ProfileScreen() {
  const { startEdit, isEditMode } = useEditContext();

  const handleEditPersonalInfo = () => {
    startEdit('personalInfo');
  };

  return (
    <View>
      <Button onPress={handleEditPersonalInfo} title="Edit Personal Info" />
      {isEditMode && <EditOverlay />}
    </View>
  );
}
```

## 📊 Data Management

### Save Profile Data
```typescript
import { dataManager } from './services/dataManager';

// Set user ID first
dataManager.setUserId('user-123');

// Save personal info
const personalInfo = {
  name: 'John Doe',
  age: '25',
  gender: 'male',
  height: '175',
  weight: '70',
  activityLevel: 'moderate',
};
await dataManager.savePersonalInfo(personalInfo);

// Save fitness goals
const fitnessGoals = {
  primaryGoals: ['weight_loss', 'muscle_gain'],
  experience: 'intermediate',
  timeCommitment: '30-45 minutes',
};
await dataManager.saveFitnessGoals(fitnessGoals);
```

### Load Profile Data
```typescript
// Load personal info (tries remote first, falls back to local)
const personalInfo = await dataManager.loadPersonalInfo();

// Load fitness goals
const fitnessGoals = await dataManager.loadFitnessGoals();

// Check if user has local data
const hasLocalData = await dataManager.hasLocalData();

// Get data summary
const summary = await dataManager.getProfileDataSummary();
```

## 🔄 Migration System

### Check Migration Status
```typescript
import { migrationManager } from './services/migrationManager';

// Check if migration is needed
const migrationNeeded = await migrationManager.checkProfileMigrationNeeded('user-123');

// Start migration
if (migrationNeeded) {
  const result = await migrationManager.startProfileMigration('user-123');
  console.log('Migration result:', result);
}
```

### Migration with UI
```typescript
import { MigrationIntegration } from './components/migration/MigrationIntegration';

// Add to your app for automatic migration handling
<MigrationIntegration
  autoPrompt={true}
  showProgressModal={true}
  onMigrationComplete={(success) => {
    console.log('Migration completed:', success);
  }}
/>
```

## ✅ Validation

### Validate Profile Data
```typescript
import { profileValidator } from './services/profileValidator';

// Validate personal info
const personalInfoValidation = profileValidator.validatePersonalInfo({
  name: 'John Doe',
  age: '25',
  gender: 'male',
  height: '175',
  weight: '70',
});

if (!personalInfoValidation.isValid) {
  console.log('Errors:', personalInfoValidation.errors);
  console.log('Warnings:', personalInfoValidation.warnings);
}

// Calculate profile completeness
const completeness = profileValidator.calculateProfileCompleteness({
  personalInfo,
  fitnessGoals,
  dietPreferences,
  workoutPreferences,
});
console.log('Profile completeness:', completeness + '%');
```

## 🧪 Testing & Debugging

### Quick Test
```typescript
import { quickMigrationTest } from './utils/testMigrationFix';

// Run quick verification
const success = await quickMigrationTest();
console.log('System working:', success);
```

### Comprehensive Test
```typescript
import { testMigrationFix } from './utils/testMigrationFix';

// Run full test suite
const result = await testMigrationFix();
console.log('Test results:', result);
```

### Debug Component
```typescript
import { MigrationTestComponent } from './components/debug/MigrationTestComponent';

// Add temporarily for testing (remove in production)
<MigrationTestComponent />
```

## 🎯 Common Use Cases

### Edit Personal Information
```typescript
// In ProfileScreen component
const { startEdit } = useEditContext();

const handleEditPersonalInfo = async () => {
  await startEdit('personalInfo', existingPersonalInfo);
};
```

### Handle Edit Completion
```typescript
// In EditProvider
<EditProvider
  onEditComplete={() => {
    // Refresh profile data
    // Show success message
    // Navigate back to profile
  }}
  onEditCancel={() => {
    // Handle cancellation
    // Show confirmation if unsaved changes
  }}
>
```

### Custom Validation
```typescript
// Add custom validation rules
const customValidation = (data) => {
  const errors = [];
  
  if (data.age && parseInt(data.age) < 13) {
    errors.push('Must be at least 13 years old');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
};
```

## 🔧 Configuration

### Performance Settings
```typescript
import { performanceMonitor, memoryOptimizer } from './utils/performance';

// Enable performance monitoring
performanceMonitor.enable();

// Configure memory cache
memoryOptimizer.setMaxCacheSize(50);
```

### Error Handling
```typescript
import { ErrorHandler, createValidationError } from './utils/errorHandling';

// Handle errors with retry
try {
  await saveProfileData();
} catch (error) {
  ErrorHandler.handleWithRetry(error, () => saveProfileData());
}

// Create custom errors
const validationError = createValidationError(
  'Invalid age value',
  'Age must be between 13 and 120',
  { field: 'age', value: inputAge }
);
```

## 🌐 Accessibility

### Screen Reader Support
```typescript
import { ProfileEditingA11y } from './utils/accessibility';

// Use accessibility helpers
const nameFieldProps = ProfileEditingA11y.personalInfo.nameField(
  value, 
  error
);

<TextInput {...nameFieldProps} />
```

### Announcements
```typescript
import { AccessibilityAnnouncements } from './utils/accessibility';

// Announce edit started
AccessibilityAnnouncements.editStarted('Personal Information');

// Announce save completed
AccessibilityAnnouncements.editSaved('Personal Information');
```

## 📱 Production Deployment

### Environment Setup
```typescript
// Enable production optimizations
if (!__DEV__) {
  performanceMonitor.disable();
  errorLogger.enable(); // Keep error logging in production
}
```

### Remove Debug Components
```typescript
// Remove before production deployment
// <MigrationTestComponent /> // Remove this
// <DebugPanel />             // Remove this
```

### Monitor Performance
```typescript
// Check performance metrics
const metrics = performanceMonitor.getMetrics();
console.log('Performance metrics:', metrics);

// Check error logs
const errors = errorLogger.getErrors();
console.log('Error count:', errors.length);
```

## 🆘 Troubleshooting

### Common Issues
```typescript
// localStorage method errors
// ✅ FIXED: Use correct method names (retrieveData, storeData, removeData)

// Migration detection errors  
// ✅ FIXED: Added hasLocalData() method

// Edit mode not working
// Check EditProvider wrapper and context availability

// Data not saving
// Check network connectivity and user authentication
```

### Debug Commands
```typescript
// Test localStorage
await dataManager.testLocalStorageMethods();

// Test migration system
await migrationManager.testMigrationFlow('test-user');

// Check data summary
const summary = await dataManager.getProfileDataSummary();
```

---

**🎉 Profile Editing System v2.0.0 - Production Ready!**
