# Remove Mock Data and Make Profile Tab Functional

## Plan & Implementation Strategy

### Overview
Remove all mock data from Fitness, Diet, and Progress tabs, and make the Profile tab fully functional with real user data and working buttons.

### Tasks Breakdown

#### Task 1: Remove Mock Data from Fitness Tab
- **Goal**: Replace mock workout data with real/empty states
- **Files to modify**: `src/screens/main/FitnessScreen.tsx`
- **Actions**:
  - Remove hardcoded workout lists
  - Replace with empty state or "coming soon" placeholders
  - Make buttons functional with proper alerts/navigation

#### Task 2: Remove Mock Data from Diet Tab  
- **Goal**: Replace mock meal/nutrition data with real/empty states
- **Files to modify**: `src/screens/main/DietScreen.tsx`
- **Actions**:
  - Remove hardcoded meal logs
  - Replace with empty state or "coming soon" placeholders
  - Make meal logging buttons functional

#### Task 3: Remove Mock Data from Progress Tab
- **Goal**: Replace mock progress charts/stats with real user data
- **Files to modify**: `src/screens/main/ProgressScreen.tsx`
- **Actions**:
  - Remove hardcoded progress data
  - Connect to real user stats from database
  - Show empty states for new users

#### Task 4: Make Profile Tab Fully Functional
- **Goal**: Show real user data and make all buttons work
- **Files to modify**: `src/screens/main/ProfileScreen.tsx`
- **Actions**:
  - Display actual user profile data (name, email, stats)
  - Make sign out button functional
  - Make edit profile button functional
  - Show user's profile picture/avatar
  - Connect all settings and preferences

### Implementation Order
1. Start with Fitness Tab (simplest)
2. Then Diet Tab
3. Then Progress Tab
4. Finally Profile Tab (most complex)

### Technical Considerations
- Use `useDashboardIntegration()` for real user data
- Follow existing component patterns
- Maintain atomic design structure
- Ensure TypeScript types are correct
- Test each component after changes

## Status
- [ ] Task 1: Fitness Tab
- [ ] Task 2: Diet Tab  
- [ ] Task 3: Progress Tab
- [ ] Task 4: Profile Tab

## Notes
Following MVP approach - focus on core functionality first, advanced features can be added later.