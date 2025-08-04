# Google Sign-In Setup Guide for FitAI

## Prerequisites

Before you can use Google Sign-In in your FitAI app, you need to:

1. **Create a Google Cloud Project**
2. **Set up OAuth consent screen**
3. **Create OAuth 2.0 credentials**
4. **Configure Supabase Auth provider**
5. **Add configuration files to your project**

## Step 1: Google Cloud Console Setup

### 1.1 Create a new project (or select existing)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for later use

### 1.2 Enable Google+ API
1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API" 
3. Click "Enable"

### 1.3 Configure OAuth consent screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill required fields:
   - App name: **FitAI - AI Fitness Coach**
   - User support email: Your email
   - App logo: Upload your FitAI logo
   - Developer contact: Your email
4. Add scopes: `../auth/userinfo.email`, `../auth/userinfo.profile`, `openid`
5. Add test users (your email and any testers)

### 1.4 Create OAuth 2.0 credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"

#### For Android:
1. Application type: **Android**
2. Name: **FitAI Android**
3. Package name: **com.fitai.app**
4. SHA-1 certificate fingerprint: Get this by running:
   ```bash
   # For development
   keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android -keypass android
   
   # For production (use your keystore)
   keytool -keystore path/to/your/keystore.keystore -list -v -alias your-alias
   ```

#### For iOS:
1. Application type: **iOS**
2. Name: **FitAI iOS**  
3. Bundle ID: **com.fitai.app**

#### For Web (optional):
1. Application type: **Web application**
2. Name: **FitAI Web**
3. Authorized redirect URIs:
   - `https://mqfrwtmkokivoxgukgsz.supabase.co/auth/v1/callback`
   - `http://localhost:8081` (for development)

## Step 2: Download Configuration Files

### 2.1 Android - google-services.json
1. In Google Cloud Console, go to your OAuth Android client
2. Download the `google-services.json` file
3. Place it in your project root: `./google-services.json`

### 2.2 iOS - GoogleService-Info.plist  
1. In Google Cloud Console, go to your OAuth iOS client
2. Download the `GoogleService-Info.plist` file
3. Place it in your project root: `./GoogleService-Info.plist`

## Step 3: Set Environment Variables

Add these to your `.env` file or EAS environment:

```bash
# Get these from your Google Cloud Console OAuth clients
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

## Step 4: Supabase Auth Provider Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/)
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Add your OAuth credentials:
   - **Client ID**: Use your Web Client ID from Google Console
   - **Client Secret**: Get this from your Web OAuth client in Google Console
   - **Redirect URL**: Should be `https://[your-project].supabase.co/auth/v1/callback`

## Step 5: Update EAS Configuration

Add the environment variables to your `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "your-web-client-id",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "your-ios-client-id",
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "your-android-client-id"
      }
    }
  }
}
```

## Step 6: Test the Integration

1. Build your app: `npm run build:preview`
2. Install on device/emulator
3. Test Google Sign-In flow
4. Check Supabase Auth dashboard for new users

## Troubleshooting

### Common Issues:

1. **"Sign in failed"**: Check SHA-1 fingerprint matches in Google Console
2. **"OAuth client not found"**: Ensure client IDs match in environment variables
3. **"Invalid redirect URI"**: Check Supabase redirect URL in Google Console
4. **"Google Play services not available"**: Test on device with Google Play services

### Debug Steps:

1. Check console logs for specific error messages
2. Verify all client IDs are correctly set in environment
3. Ensure google-services.json and GoogleService-Info.plist are in project root
4. Test with a fresh build after configuration changes

## Production Checklist

- [ ] Production SHA-1 fingerprint added to Google Console
- [ ] OAuth consent screen published (not in testing mode)
- [ ] All environment variables set in EAS production profile
- [ ] Supabase Auth provider configured with production client details
- [ ] Test Google Sign-In on production build

## Security Notes

- Never commit `google-services.json` or `GoogleService-Info.plist` to version control
- Keep client secrets secure and only in server environments
- Regularly rotate OAuth credentials if compromised
- Monitor Supabase Auth logs for suspicious activity