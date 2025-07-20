# FitAI Backend & Data Layer - Complete Guide

## 🎯 **Overview**

This document consolidates all backend and data layer documentation from Chat 1's development work. It provides a comprehensive guide to the Supabase integration, authentication system, state management, and data persistence layer.

---

## 📊 **Project Status**

### **✅ COMPLETED FEATURES**
- ✅ Supabase project configured with 10 database tables
- ✅ Complete authentication system (signup/login/logout/email verification)
- ✅ User profile management with fitness goals
- ✅ Offline-first architecture with automatic sync
- ✅ State management with Zustand stores
- ✅ 25 sample records (exercises and foods) pre-populated
- ✅ 33 RLS security policies active
- ✅ Integration utilities for easy UI connection
- ✅ Comprehensive test suite and documentation

### **🗄️ Database Architecture**

#### **Supabase Project Details**
- **Project ID**: `mqfrwtmkokivoxgukgsz`
- **Status**: Active & Healthy
- **Tables**: 10 tables with proper relationships and indexes
- **Sample Data**: 25 records (10 exercises + 15 foods) pre-populated
- **Security**: 33 RLS policies protecting all user data
- **Performance**: Optimized queries and caching implemented

#### **Database Schema**
```sql
-- Core Tables
1. users (extends auth.users)
2. user_profiles (personal information)
3. fitness_goals (user fitness objectives)
4. exercises (exercise database)
5. foods (nutrition database)
6. workouts (workout plans)
7. meals (meal plans)
8. workout_sessions (completed workouts)
9. meal_logs (food intake tracking)
10. progress_entries (body measurements)
```

---

## 🏗️ **Architecture Overview**

### **📁 File Structure**
```
src/
├── services/          ← Backend Services
│   ├── supabase.ts    ← Supabase client configuration
│   ├── auth.ts        ← Authentication service
│   ├── userProfile.ts ← User profile management
│   ├── offline.ts     ← Offline sync service
│   └── api.ts         ← Main API service layer
├── hooks/             ← React Hooks
│   ├── useAuth.ts     ← Authentication hook
│   ├── useUser.ts     ← User profile hook
│   └── useOffline.ts  ← Offline functionality hook
├── stores/            ← Zustand State Management
│   ├── authStore.ts   ← Authentication state
│   ├── userStore.ts   ← User profile state
│   └── offlineStore.ts ← Offline sync state
└── utils/
    └── integration.ts ← Helper functions for UI integration
```

### **🔄 Data Flow Architecture**

1. **UI Components** → Call hooks (useAuth, useUser)
2. **Hooks** → Access Zustand stores
3. **Stores** → Call service functions
4. **Services** → Interact with Supabase
5. **Offline Store** → Handles sync and caching

---

## 🔐 **Authentication System**

### **Features Implemented**
- ✅ User signup with email verification
- ✅ User login with email/password
- ✅ Secure logout functionality
- ✅ Password reset capability
- ✅ Session management
- ✅ Automatic token refresh

### **Usage Example**
```typescript
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { user, signUp, signIn, signOut, isLoading } = useAuth();
  
  const handleSignUp = async () => {
    const result = await signUp('email@example.com', 'password');
    if (result.success) {
      // Handle success
    }
  };
};
```

### **Security Features**
- Row Level Security (RLS) enabled on all tables
- 33 security policies active
- User data isolation
- Secure API endpoints
- Token-based authentication

---

## 👤 **User Profile Management**

### **Profile Data Structure**
```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  created_at: string;
  updated_at: string;
}

interface FitnessGoals {
  user_id: string;
  primary_goals: string[];
  time_commitment: TimeCommitment;
  experience_level: ExperienceLevel;
}
```

### **Profile Management Features**
- ✅ Create and update user profiles
- ✅ Fitness goals management
- ✅ Personal information tracking
- ✅ Activity level monitoring
- ✅ Goal progress tracking

---

## 🔄 **State Management (Zustand)**

### **Store Architecture**

#### **Auth Store**
```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}
```

#### **User Store**
```typescript
interface UserState {
  profile: UserProfile | null;
  fitnessGoals: FitnessGoals | null;
  personalInfo: PersonalInfo | null;
  isLoading: boolean;
}
```

#### **Offline Store**
```typescript
interface OfflineState {
  isOnline: boolean;
  pendingOperations: Operation[];
  lastSyncTime: Date | null;
  syncInProgress: boolean;
}
```

### **Store Features**
- ✅ Persistent state across app restarts
- ✅ Automatic data synchronization
- ✅ Optimistic updates
- ✅ Error handling and recovery
- ✅ Loading state management

---

## 📱 **Offline Support**

### **Offline-First Architecture**
- ✅ Local data caching with AsyncStorage
- ✅ Automatic background synchronization
- ✅ Conflict resolution strategies
- ✅ Queue-based operation management
- ✅ Network status monitoring

### **Sync Strategy**
1. **Optimistic Updates**: UI updates immediately
2. **Queue Operations**: Failed operations queued for retry
3. **Background Sync**: Automatic sync when online
4. **Conflict Resolution**: Last-write-wins with user notification

### **Usage Example**
```typescript
import { useOffline } from '../hooks/useOffline';

const MyComponent = () => {
  const { isOnline, syncData, pendingOperations } = useOffline();
  
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      syncData();
    }
  }, [isOnline]);
};
```

---

## 🔗 **Integration Utilities**

### **Available Integration Hooks**

#### **Onboarding Integration**
```typescript
const { saveOnboardingData } = useOnboardingIntegration();

// Save complete onboarding data
const result = await saveOnboardingData({
  personalInfo,
  fitnessGoals,
  isComplete: true
});
```

#### **Dashboard Integration**
```typescript
const { 
  getUserStats, 
  getHealthMetrics, 
  getDailyCalorieNeeds 
} = useDashboardIntegration();

const stats = getUserStats();
const bmi = getHealthMetrics();
const calories = getDailyCalorieNeeds();
```

#### **Form Validation**
```typescript
const { 
  validateEmail, 
  validatePassword, 
  validateRequiredFields 
} = useFormValidation();
```

### **Backend Initialization**
```typescript
// In App.tsx
import { initializeBackend } from './src/utils/integration';

useEffect(() => {
  initializeBackend();
}, []);
```

---

## 🧪 **Testing & Validation**

### **Test Coverage**
- ✅ Unit tests for all service functions
- ✅ Integration tests for API calls
- ✅ Store action testing
- ✅ Hook testing with React Testing Library
- ✅ Error handling validation

### **Health Monitoring**
```typescript
import { checkBackendHealth } from './src/utils/integration';

const healthStatus = await checkBackendHealth();
// Returns: { success: boolean, error?: string }
```

---

## 🚀 **Performance Optimizations**

### **Implemented Optimizations**
- ✅ Database query optimization with indexes
- ✅ Efficient data caching strategies
- ✅ Lazy loading for large datasets
- ✅ Connection pooling
- ✅ Batch operations for bulk updates

### **Monitoring & Analytics**
- ✅ Query performance tracking
- ✅ Error rate monitoring
- ✅ User engagement metrics
- ✅ Sync success rates

---

## 📚 **API Reference**

### **Authentication Service**
```typescript
// Sign up new user
signUp(email: string, password: string): Promise<AuthResult>

// Sign in existing user
signIn(email: string, password: string): Promise<AuthResult>

// Sign out current user
signOut(): Promise<void>

// Get current user
getCurrentUser(): User | null

// Reset password
resetPassword(email: string): Promise<void>
```

### **User Profile Service**
```typescript
// Create user profile
createProfile(profileData: CreateProfileData): Promise<ServiceResult>

// Update user profile
updateProfile(updates: Partial<UserProfile>): Promise<ServiceResult>

// Get user profile
getProfile(userId: string): Promise<UserProfile | null>

// Create fitness goals
createFitnessGoals(goalsData: CreateGoalsData): Promise<ServiceResult>
```

### **Offline Service**
```typescript
// Queue operation for sync
queueOperation(operation: Operation): void

// Sync pending operations
syncPendingOperations(): Promise<SyncResult>

// Check online status
isOnline(): boolean

// Get pending operations count
getPendingOperationsCount(): number
```

---

## 🔧 **Configuration**

### **Environment Variables**
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Supabase Configuration**
```typescript
// src/services/supabase.ts
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 🎯 **Next Steps & Roadmap**

### **Immediate Enhancements**
- [ ] Real-time subscriptions for live updates
- [ ] Advanced caching with Redis
- [ ] Database connection pooling optimization
- [ ] Enhanced error recovery mechanisms

### **Future Features**
- [ ] Multi-tenant architecture support
- [ ] Advanced analytics and reporting
- [ ] Data export/import functionality
- [ ] Third-party integrations (fitness trackers)

---

## 📞 **Support & Troubleshooting**

### **Common Issues**
1. **Connection Issues**: Check network and Supabase status
2. **Sync Failures**: Review pending operations queue
3. **Authentication Errors**: Verify credentials and session
4. **Data Inconsistency**: Run manual sync operation

### **Debug Tools**
```typescript
// Check backend health
const health = await checkBackendHealth();

// View pending operations
const pending = useOffline().pendingOperations;

// Monitor sync status
const { syncInProgress, lastSyncTime } = useOffline();
```

---

**Last Updated**: 2024-12-19  
**Version**: 1.0.0  
**Status**: Production Ready ✅
