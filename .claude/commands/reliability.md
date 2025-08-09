# Reliability Audit Command

Perform a comprehensive reliability audit of the FitAI codebase with the following systematic approach:

## Phase 1: Critical Error Handling Issues

### 1.1 Empty Catch Blocks Analysis
Search for empty catch blocks that need proper error handling:
```bash
grep -r "catch.*{[\s]*}" src/ --include="*.ts" --include="*.tsx"
```

For each empty catch block found:
- Implement proper error logging with context
- Add user-friendly error messages
- Include error reporting to monitoring service
- Add retry logic where appropriate

### 1.2 Unhandled Promise Rejections
Search for promises without proper error handling:
```bash
grep -r "await.*(" src/ --include="*.ts" --include="*.tsx" -A 2 -B 2
```

Look for patterns like:
- `await functionCall()` without try-catch
- `.then()` without `.catch()`
- Async functions without error boundaries

### 1.3 Missing Error Boundaries
Identify React components that need error boundaries:
- All screen components in `src/screens/`
- Major feature components
- Components that make API calls
- Components with complex state logic

## Phase 2: React Native Specific Issues

### 2.1 HostFunction Error Patterns
Search for problematic style patterns:
```bash
grep -r "fontWeight.*['\"]" src/ --include="*.ts" --include="*.tsx"
grep -r "lineHeight:" src/ --include="*.ts" --include="*.tsx"
grep -r "fontFamily:" src/ --include="*.ts" --include="*.tsx"
```

### 2.2 Module-Level Execution Issues
Find module-level React Native API calls:
```bash
grep -r "export.*const.*=.*Dimensions\|getDeviceInfo" src/ --include="*.ts" --include="*.tsx"
```

### 2.3 Memory Leak Potential
Check for:
- Missing cleanup in useEffect hooks
- Unsubscribed event listeners  
- Retained references to large objects
- Improper async operation handling

## Phase 3: Performance and Stability

### 3.1 Bundle Size Analysis
Run bundle analyzer and check:
- Total app size (target: <50MB)
- Largest dependencies
- Duplicate dependencies
- Unused imports

### 3.2 Memory Usage Patterns
Analyze components for:
- Large state objects
- Heavy computation in renders
- Inefficient re-renders
- Memory-heavy operations

### 3.3 Animation Performance
Verify all animations:
- Run at 60fps
- Use native driver where possible
- Proper cleanup on unmount
- No blocking main thread

## Phase 4: TODO Resolution Strategy

### 4.1 Categorize All TODOs
Scan and categorize all TODO items:
```bash
grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx" -n
```

**Priority 1 (Critical - Fix Immediately):**
- TODOs in core services (dataManager, AI services, auth)
- Security-related TODOs
- Performance-impacting TODOs

**Priority 2 (High - Fix This Sprint):**
- User-facing feature TODOs
- Error handling improvements
- Data validation TODOs

**Priority 3 (Medium - Next Sprint):**
- Code optimization TODOs
- Developer experience improvements
- Documentation TODOs

**Priority 4 (Low - Backlog):**
- Nice-to-have features
- Minor optimizations
- Non-critical refactoring

### 4.2 Implementation Requirements
For each TODO resolution:
- Add proper TypeScript types
- Include comprehensive error handling
- Add loading and error states for UI
- Include unit tests for new logic
- Update documentation

## Phase 5: Security and Quality Scan

### 5.1 Security Issues
Search for potential security vulnerabilities:
- Hardcoded API keys or secrets
- Unvalidated user inputs
- Insecure storage usage
- Network security issues

### 5.2 Code Quality Metrics
Verify:
- TypeScript coverage: 100% (no `any` types)
- Test coverage: >90% on critical business logic
- ESLint compliance: Zero warnings
- Performance budget compliance

## Phase 6: Automated Testing Coverage

### 6.1 Critical Path Testing
Ensure tests cover:
- Authentication flows
- AI service integrations
- Data persistence and sync
- Error handling paths
- Performance requirements

### 6.2 Integration Testing
Test complete user workflows:
- Onboarding flow
- Workout generation and completion
- Meal planning and tracking
- Progress monitoring
- Data sync and offline support

## Deliverable: Action Plan

Generate a comprehensive action plan with:

1. **Critical Issues** (Fix immediately):
   - Specific file paths and line numbers
   - Exact error patterns found
   - Recommended solutions
   - Estimated effort (hours)

2. **High Priority Issues** (Fix this sprint):
   - Impact on user experience
   - Technical debt assessment
   - Implementation approach
   - Dependencies and blockers

3. **Medium Priority Issues** (Next sprint):
   - Performance improvements
   - Code quality enhancements
   - Developer experience improvements

4. **Low Priority Issues** (Backlog):
   - Nice-to-have optimizations
   - Non-critical refactoring
   - Future feature enablement

**Success Metrics:**
- Zero empty catch blocks
- Zero unhandled promise rejections
- 99.5%+ crash-free rate
- <3 second app startup time
- All Priority 1 and 2 TODOs resolved
- 100% TypeScript coverage
- 90%+ test coverage on critical paths

Focus on making the existing 30% of the app absolutely bulletproof before adding new features.