# FitAI - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying FitAI across development, staging, and production environments. The deployment strategy uses Expo Application Services (EAS) for mobile app deployment and Supabase for backend infrastructure.

## Environment Setup

### Development Environment

#### Prerequisites
```bash
# Node.js (LTS version)
node --version  # Should be 18.x or higher

# Expo CLI
npm install -g @expo/cli@latest

# EAS CLI
npm install -g eas-cli@latest

# Supabase CLI
npm install -g supabase@latest

# Android Studio (for Android development)
# Xcode (for iOS development - macOS only)
```

#### Project Setup
```bash
# Clone repository
git clone https://github.com/your-org/fitai-mobile.git
cd fitai-mobile

# Install dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Copy environment template
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your API keys and configuration
```

#### Environment Variables
```bash
# .env.local (Development)
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-dev-gemini-key
EXPO_PUBLIC_FATSECRET_TOKEN=your-dev-fatsecret-token
EXPO_PUBLIC_API_NINJAS_KEY=your-dev-api-ninjas-key
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_BASE_URL=http://localhost:54321
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Staging Environment
```bash
# .env.staging
EXPO_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-staging-gemini-key
EXPO_PUBLIC_FATSECRET_TOKEN=your-staging-fatsecret-token
EXPO_PUBLIC_API_NINJAS_KEY=your-staging-api-ninjas-key
EXPO_PUBLIC_ENVIRONMENT=staging
EXPO_PUBLIC_API_BASE_URL=https://api-staging.fitai.app
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Production Environment
```bash
# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-prod-gemini-key
EXPO_PUBLIC_FATSECRET_TOKEN=your-prod-fatsecret-token
EXPO_PUBLIC_API_NINJAS_KEY=your-prod-api-ninjas-key
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_BASE_URL=https://api.fitai.app
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## Supabase Backend Deployment

### Database Setup

#### Initial Migration
```sql
-- migrations/001_initial_schema.sql
-- Run in Supabase SQL Editor or via CLI

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create tables (from backend.md)
-- Copy the table creation scripts from the backend guide

-- Set up Row Level Security policies
-- Copy RLS policies from backend guide

-- Create storage buckets
-- Copy storage setup from backend guide
```

#### Supabase CLI Deployment
```bash
# Initialize Supabase locally
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Generate TypeScript types
supabase gen types typescript --linked > src/types/supabase.ts

# Deploy migrations
supabase db push

# Deploy edge functions
supabase functions deploy food-recognition
supabase functions deploy generate-workout
supabase functions deploy generate-diet-plan
```

### Environment-Specific Supabase Setup

#### Development
```bash
# Start local Supabase
supabase start

# Reset database
supabase db reset

# Seed with test data
supabase db seed
```

#### Staging
```bash
# Deploy to staging
supabase link --project-ref your-staging-ref
supabase db push
supabase functions deploy --project-ref your-staging-ref
```

#### Production
```bash
# Deploy to production
supabase link --project-ref your-prod-ref
supabase db push
supabase functions deploy --project-ref your-prod-ref

# Enable database backups
# Configure in Supabase dashboard
```

## Mobile App Deployment

### EAS Configuration

#### EAS Project Configuration
```json
// eas.json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "ENVIRONMENT": "staging"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

#### App Configuration
```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.ENVIRONMENT === 'production';
  const isStaging = process.env.ENVIRONMENT === 'staging';
  
  return {
    ...config,
    name: isProduction ? 'FitAI' : `FitAI ${isStaging ? 'Staging' : 'Dev'}`,
    slug: 'fitai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: isProduction 
        ? 'com.fitai.app' 
        : `com.fitai.app.${isStaging ? 'staging' : 'dev'}`,
      buildNumber: process.env.BUILD_NUMBER || '1'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: isProduction 
        ? 'com.fitai.app' 
        : `com.fitai.app.${isStaging ? 'staging' : 'dev'}`,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1'),
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'RECORD_AUDIO'
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      'expo-camera',
      'expo-image-picker',
      'expo-sqlite',
      [
        '@sentry/react-native/expo',
        {
          organization: 'your-sentry-org',
          project: 'fitai-mobile'
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0'
          },
          ios: {
            deploymentTarget: '13.0'
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: 'your-eas-project-id'
      },
      environment: process.env.ENVIRONMENT || 'development'
    },
    updates: {
      url: 'https://u.expo.dev/your-eas-project-id'
    },
    runtimeVersion: {
      policy: 'sdkVersion'
    }
  };
};
```

### Build Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    
    "build:dev:android": "eas build --platform android --profile development",
    "build:staging:android": "eas build --platform android --profile preview",
    "build:prod:android": "eas build --platform android --profile production",
    
    "build:dev:ios": "eas build --platform ios --profile development",
    "build:staging:ios": "eas build --platform ios --profile preview",
    "build:prod:ios": "eas build --platform ios --profile production",
    
    "submit:android": "eas submit --platform android --profile production",
    "submit:ios": "eas submit --platform ios --profile production",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "type-check": "tsc --noEmit",
    
    "generate:types": "supabase gen types typescript --linked > src/types/supabase.ts",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase db push"
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

#### Main Workflow
```yaml
# .github/workflows/main.yml
name: FitAI CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  EXPO_CLI_VERSION: 'latest'

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type check
        run: npm run type-check
        
      - name: Lint
        run: npm run lint
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build-staging:
    name: Build Staging
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: ${{ env.EXPO_CLI_VERSION }}
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build Android (Staging)
        run: |
          export ENVIRONMENT=staging
          eas build --platform android --profile preview --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#fitai-dev'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  build-production:
    name: Build Production
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: ${{ env.EXPO_CLI_VERSION }}
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build Android (Production)
        run: |
          export ENVIRONMENT=production
          export BUILD_NUMBER=${{ github.run_number }}
          eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          
      - name: Submit to Play Store
        if: success()
        run: eas submit --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          
      - name: Create GitHub Release
        if: success()
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v1.0.${{ github.run_number }}
          release_name: Release v1.0.${{ github.run_number }}
          draft: false
          prerelease: false

  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Supabase CLI
        run: |
          curl -fsSL https://supabase.com/install.sh | sh
          echo "$HOME/.local/bin" >> $GITHUB_PATH
          
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy food-recognition --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy generate-workout --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy generate-diet-plan --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run Database Migrations
        run: |
          supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Deployment Scripts

#### Automated Deployment Script
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
PLATFORM=${2:-android}

echo "🚀 Deploying FitAI to $ENVIRONMENT environment for $PLATFORM"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(android|ios|all)$ ]]; then
    echo "❌ Invalid platform. Use 'android', 'ios', or 'all'"
    exit 1
fi

# Set environment variables
export ENVIRONMENT=$ENVIRONMENT
export BUILD_NUMBER=$(date +%Y%m%d%H%M%S)

echo "📋 Environment: $ENVIRONMENT"
echo "📋 Build Number: $BUILD_NUMBER"
echo "📋 Platform: $PLATFORM"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Type check
echo "🔍 Type checking..."
npm run type-check

# Lint
echo "🧹 Linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build profile based on environment
if [[ "$ENVIRONMENT" == "staging" ]]; then
    PROFILE="preview"
else
    PROFILE="production"
fi

# Build for specified platform(s)
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
    echo "🏗️  Building Android ($PROFILE)..."
    eas build --platform android --profile $PROFILE --non-interactive
fi

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
    echo "🏗️  Building iOS ($PROFILE)..."
    eas build --platform ios --profile $PROFILE --non-interactive
fi

# Submit to stores if production
if [[ "$ENVIRONMENT" == "production" ]]; then
    read -p "🤔 Submit to app stores? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
            echo "📤 Submitting to Google Play Store..."
            eas submit --platform android --profile production --non-interactive
        fi
        
        if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
            echo "📤 Submitting to App Store..."
            eas submit --platform ios --profile production --non-interactive
        fi
    fi
fi

echo "✅ Deployment completed successfully!"
```

#### Make script executable
```bash
chmod +x scripts/deploy.sh

# Usage examples:
./scripts/deploy.sh staging android
./scripts/deploy.sh production all
```

## Monitoring & Analytics

### Error Tracking with Sentry

#### Sentry Configuration
```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/react-native';
import { isProduction } from './environment';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
  enabled: isProduction,
  debug: !isProduction,
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.exception) {
      const error = hint.originalException;
      console.error('Captured error:', error);
    }
    return event;
  },
});

export { Sentry };
```

### Performance Monitoring

#### Performance Tracking Setup
```typescript
// src/services/monitoring/performanceMonitor.ts
import { Performance } from 'react-native-performance';
import { Analytics } from '@segment/analytics-react-native';

export class PerformanceMonitor {
  static startScreenLoad(screenName: string) {
    Performance.mark(`${screenName}_start`);
  }

  static endScreenLoad(screenName: string) {
    Performance.mark(`${screenName}_end`);
    Performance.measure(
      `${screenName}_load_time`,
      `${screenName}_start`,
      `${screenName}_end`
    );

    const measures = Performance.getEntriesByName(`${screenName}_load_time`);
    if (measures.length > 0) {
      const loadTime = measures[0].duration;
      
      Analytics.track('Screen Load Time', {
        screen: screenName,
        loadTime: loadTime,
        timestamp: new Date().toISOString(),
      });
    }
  }

  static trackCustomMetric(name: string, value: number, attributes?: Record<string, any>) {
    Analytics.track('Custom Metric', {
      metricName: name,
      value: value,
      ...attributes,
    });
  }
}
```

## Security Considerations

### API Key Management
```typescript
// src/config/security.ts
import { ConfigService } from './configService';

export class SecurityManager {
  static validateEnvironment() {
    const requiredKeys = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_GEMINI_API_KEY',
    ];

    for (const key of requiredKeys) {
      if (!ConfigService.get(key)) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  static sanitizeErrorMessage(error: Error): string {
    // Remove sensitive information from error messages
    let message = error.message;
    
    // Remove API keys, tokens, etc.
    message = message.replace(/([a-zA-Z0-9_-]{32,})/g, '[REDACTED]');
    message = message.replace(/(key|token|secret)=([^&\s]+)/gi, '$1=[REDACTED]');
    
    return message;
  }
}
```

### App Signing

#### Android Signing Configuration
```bash
# Generate keystore for production
keytool -genkey -v -keystore fitai-release-key.keystore -alias fitai-release -keyalg RSA -keysize 2048 -validity 10000

# Store in EAS secrets
eas secret:create --scope project --name ANDROID_KEYSTORE_BASE64 --value $(base64 -i fitai-release-key.keystore)
eas secret:create --scope project --name ANDROID_KEYSTORE_ALIAS --value fitai-release
eas secret:create --scope project --name ANDROID_KEYSTORE_PASSWORD --value your-keystore-password
eas secret:create --scope project --name ANDROID_KEY_PASSWORD --value your-key-password
```

## Rollback Procedures

### Emergency Rollback Script
```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_VERSION=${1}

if [[ -z "$PREVIOUS_VERSION" ]]; then
    echo "❌ Please provide the version to rollback to"
    echo "Usage: ./rollback.sh v1.0.123"
    exit 1
fi

echo "🔄 Rolling back to version $PREVIOUS_VERSION"

# Rollback database migrations if needed
echo "🗃️  Checking database state..."
supabase db dump --file backup-before-rollback.sql

# Rollback edge functions
echo "🔄 Rolling back edge functions..."
git checkout $PREVIOUS_VERSION -- supabase/functions/
supabase functions deploy food-recognition
supabase functions deploy generate-workout

# Notify team
echo "📢 Rollback completed. Please verify all systems are working correctly."
```

## Maintenance Tasks

### Database Maintenance
```sql
-- scripts/maintenance.sql

-- Clean up old meal logs (older than 1 year)
DELETE FROM meal_logs 
WHERE logged_at < NOW() - INTERVAL '1 year';

-- Clean up temporary user data
DELETE FROM users 
WHERE created_at < NOW() - INTERVAL '30 days' 
AND last_login IS NULL;

-- Update search counts for popular foods
UPDATE foods 
SET popularity_score = log_count + search_count 
WHERE updated_at < NOW() - INTERVAL '1 day';

-- Optimize database
VACUUM ANALYZE;
```

### Log Cleanup Script
```bash
#!/bin/bash
# scripts/cleanup-logs.sh

# Clean up old log files
find /var/log/fitai -name "*.log" -mtime +30 -delete

# Compress recent logs
find /var/log/fitai -name "*.log" -mtime +7 -exec gzip {} \;

echo "✅ Log cleanup completed"
```

This comprehensive deployment guide ensures reliable, secure, and scalable deployment of the FitAI application across all environments while maintaining proper monitoring, security, and maintenance procedures.