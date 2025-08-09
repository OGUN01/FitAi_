# Security Scan Command

Perform a comprehensive security analysis of the FitAI React Native application:

## Phase 1: Secrets and Credentials Audit

### 1.1 Hardcoded Secrets Detection
Search for potentially exposed secrets and credentials:

```bash
# Search for common secret patterns
grep -r -i "api[_-]?key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
grep -r "pk_\|sk_\|AKIA\|-----BEGIN" src/ --include="*.ts" --include="*.tsx"
grep -r -E "['\"]?[A-Za-z0-9]{32,}['\"]?" src/ --include="*.ts" --include="*.tsx" | grep -v ".map\|.filter\|.reduce"
```

### 1.2 Environment Variable Security
Validate environment variable handling:

**Check for:**
- Proper use of `process.env` vs `Constants.expoConfig`
- Secrets not exposed in client-side code
- Proper environment variable validation
- Secure storage for sensitive configuration

```typescript
// ✅ Secure environment variable usage
const API_KEY = Constants.expoConfig?.extra?.geminiApiKey;
if (!API_KEY) {
  throw new Error('Gemini API key not configured');
}

// ❌ Insecure - hardcoded secret
const API_KEY = "AIzaSyC_hardcoded_key_example";
```

### 1.3 Configuration File Security
Audit configuration files for sensitive data:

**Files to Review:**
- `eas.json` - Check for exposed secrets in build configuration
- `app.json` - Validate expo configuration security
- `package.json` - Review scripts and dependencies
- `.env` files - Ensure proper gitignore configuration

## Phase 2: Input Validation and Sanitization

### 2.1 User Input Validation
Audit all user input handling:

**Areas to Review:**
- Form inputs in onboarding screens
- Search functionality
- File uploads (images)
- API request parameters

```typescript
// ✅ Proper input validation
const validateUserInput = (input: string): boolean => {
  // Sanitize HTML
  const sanitized = DOMPurify.sanitize(input);
  
  // Validate length
  if (sanitized.length > MAX_INPUT_LENGTH) return false;
  
  // Validate patterns
  const dangerousPatterns = /<script|javascript:|data:/i;
  if (dangerousPatterns.test(sanitized)) return false;
  
  return true;
};

// ❌ No validation
const handleInput = (userInput: string) => {
  // Direct usage without validation
  setUserData(userInput);
};
```

### 2.2 API Parameter Sanitization
Ensure all API parameters are properly validated:

```typescript
// ✅ Secure API parameter handling
const makeAPIRequest = async (params: APIParams) => {
  // Validate required fields
  const validatedParams = APIParamsSchema.parse(params);
  
  // Sanitize string inputs
  const sanitizedParams = sanitizeAPIParams(validatedParams);
  
  return await api.request(sanitizedParams);
};
```

## Phase 3: Network Security

### 3.1 HTTPS Enforcement
Verify all network communications use HTTPS:

```bash
# Search for HTTP URLs
grep -r "http://" src/ --include="*.ts" --include="*.tsx"
grep -r -i "fetch.*http\|axios.*http" src/ --include="*.ts" --include="*.tsx"
```

**Security Requirements:**
- All API endpoints must use HTTPS
- No mixed content (HTTP resources on HTTPS pages)
- Certificate pinning for critical APIs
- Proper SSL/TLS configuration

### 3.2 API Security Headers
Ensure proper security headers in API communications:

```typescript
// ✅ Secure API configuration
const apiClient = axios.create({
  baseURL: 'https://api.fitai.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // Add security headers
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
});
```

### 3.3 Authentication Security
Audit authentication implementation:

**Security Checks:**
- Secure token storage (Keychain/Keystore)
- Token expiration handling
- Refresh token rotation
- Logout token invalidation

```typescript
// ✅ Secure token storage
import * as Keychain from 'react-native-keychain';

const storeAuthToken = async (token: string) => {
  await Keychain.setInternetCredentials(
    'fitai-auth',
    'user',
    token,
    {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
    }
  );
};
```

## Phase 4: Data Storage Security

### 4.1 Local Storage Security
Audit local data storage practices:

**Areas to Review:**
- AsyncStorage usage for sensitive data
- SQLite database encryption
- File system storage security
- Cache security for sensitive information

```typescript
// ✅ Secure local storage
import EncryptedStorage from 'react-native-encrypted-storage';

const storeSensitiveData = async (key: string, value: any) => {
  try {
    await EncryptedStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to store sensitive data:', error);
  }
};

// ❌ Insecure storage
AsyncStorage.setItem('user_password', password); // Never store passwords
```

### 4.2 Database Security
Review Supabase integration security:

**Security Checklist:**
- Row Level Security (RLS) policies implemented
- Proper user permissions and roles
- SQL injection prevention
- Data encryption at rest
- Audit logging for sensitive operations

## Phase 5: Code Security Analysis

### 5.1 Dependency Vulnerability Scan
Check for vulnerable dependencies:

```bash
# Check for known vulnerabilities
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Advanced vulnerability scanning
npx snyk test
```

### 5.2 React Native Security Best Practices
Audit React Native specific security concerns:

**Areas to Review:**
- Debug mode disabled in production builds
- Developer tools disabled in production
- Proper obfuscation and minification
- Native module security

```typescript
// ✅ Production security check
if (__DEV__) {
  // Development-only code
  console.log('Development mode enabled');
} else {
  // Ensure debug features are disabled
  console.log = () => {}; // Disable console logs
}
```

### 5.3 Dynamic Analysis
Perform runtime security testing:

**Testing Areas:**
- Man-in-the-middle attack resistance
- Root/jailbreak detection
- Runtime application self-protection
- Anti-tampering measures

## Phase 6: Privacy and Compliance

### 6.1 Data Privacy Audit
Review data collection and handling:

**Privacy Checklist:**
- Minimal data collection principle
- User consent for data collection
- Data retention policies
- Right to deletion implementation
- Cross-border data transfer compliance

### 6.2 Permissions Audit
Review app permissions and justify necessity:

**Permission Analysis:**
- Camera access for body analysis
- Storage access for image caching
- Network access for API communication
- Location access (if implemented)

```typescript
// ✅ Permission request with justification
const requestCameraPermission = async () => {
  const permission = await request(PERMISSIONS.ANDROID.CAMERA);
  
  if (permission === RESULTS.DENIED) {
    Alert.alert(
      'Camera Access',
      'FitAI needs camera access to analyze your workout form and provide personalized feedback.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Access', onPress: () => openSettings() }
      ]
    );
  }
};
```

## Phase 7: Security Monitoring

### 7.1 Error Logging Security
Ensure error logging doesn't expose sensitive information:

```typescript
// ✅ Secure error logging
const logSecureError = (error: Error, context: any) => {
  // Remove sensitive information before logging
  const sanitizedContext = {
    ...context,
    password: '[REDACTED]',
    token: '[REDACTED]',
    apiKey: '[REDACTED]'
  };
  
  errorLogger.log(error.message, sanitizedContext);
};
```

### 7.2 Security Incident Response
Implement security monitoring and alerting:

**Monitoring Areas:**
- Unusual API usage patterns
- Failed authentication attempts
- Data access anomalies
- Performance degradation (potential attacks)

## Phase 8: Security Testing

### 8.1 Penetration Testing Checklist
Perform basic penetration testing:

**Testing Areas:**
- Input validation bypass attempts
- Authentication bypass testing
- Authorization testing
- Session management testing
- API endpoint security testing

### 8.2 Security Code Review
Conduct thorough security code review:

**Review Areas:**
- Cryptographic implementations
- Authentication flows
- Data validation logic
- Error handling patterns
- Third-party integrations

## Deliverable: Security Assessment Report

Generate a comprehensive security report with:

### Critical Security Issues (Fix Immediately)
- Exposed secrets or credentials
- Insecure authentication flows
- SQL injection vulnerabilities
- Cross-site scripting (XSS) vulnerabilities

### High Priority Security Issues (Fix This Sprint)
- Missing input validation
- Insecure data storage
- Weak encryption implementations
- Missing security headers

### Medium Priority Security Issues (Next Sprint)
- Dependency vulnerabilities
- Insufficient logging
- Missing rate limiting
- Privacy compliance gaps

### Low Priority Security Issues (Backlog)
- Security header optimizations
- Code obfuscation improvements
- Additional security monitoring

**Security Metrics:**
- Zero high-severity vulnerabilities
- All API endpoints using HTTPS
- 100% input validation coverage
- Secure token storage implementation
- Privacy compliance verification
- Regular security dependency updates

**Compliance Checklist:**
- GDPR compliance for EU users
- CCPA compliance for California users
- Mobile app security best practices
- Industry-standard encryption usage
- Secure development lifecycle implementation

Focus on addressing critical and high-priority security issues before production release to ensure user data protection and application security.