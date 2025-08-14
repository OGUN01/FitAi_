# YouTube Data API v3 Setup Guide

## Quick Setup (2 minutes)

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name: `FitAI-YouTube-API` 
4. Click "Create"

### 2. Enable YouTube Data API v3
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on "YouTube Data API v3"
4. Click "ENABLE"

### 3. Create API Key
1. Go to "APIs & Services" → "Credentials" 
2. Click "+ CREATE CREDENTIALS" → "API Key"
3. Copy the generated API key
4. Click "RESTRICT KEY" (recommended)
5. Under "API restrictions", select "Restrict key"
6. Choose "YouTube Data API v3" from the dropdown
7. Click "SAVE"

### 4. Add to Environment
1. Open `.env` file in your project root
2. Replace `YOUR_YOUTUBE_API_KEY_HERE` with your actual API key:
   ```
   EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyC-your-actual-api-key-here
   ```
3. Save the file

## API Quota Information

**Free Tier Limits:**
- ✅ **10,000 units per day** (completely free)
- ✅ **~100 video searches per day** (each search = 100 units)
- ✅ **Perfect for development and small-scale apps**

**Usage Optimization:**
- Videos are cached for 72 hours to minimize API calls
- Fallback to Invidious instances when quota exceeded
- Smart caching means same meals won't be searched repeatedly

## Test Your Setup

After adding the API key, restart your development server:
```bash
npm start
```

The app will now use YouTube Data API v3 for reliable video search with Invidious as fallback.

## Troubleshooting

**"API key not configured" message:**
- Ensure you've added the key to `.env` file
- Restart your development server after adding the key

**"YouTube API error: 403":**
- Check that YouTube Data API v3 is enabled in Google Cloud Console
- Verify API key restrictions allow YouTube Data API v3

**"Quota exceeded" errors:**
- You've used your daily 10,000 units
- App will automatically fall back to Invidious instances
- Quota resets daily at midnight Pacific Time

## Production Deployment

For production apps with higher usage, you can:
1. Request quota increase (up to 1,000,000 units/day)
2. Use multiple API keys with rotation
3. Implement more aggressive caching strategies

The current implementation is production-ready for most apps with proper caching and fallback systems.