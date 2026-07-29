# Google Play Data Safety Form - FitAI

## Overview

FitAI is an AI-powered fitness companion that collects personal, health, and fitness data to provide personalized workout and nutrition recommendations. Data is stored securely in Supabase and processed via Google Gemini AI. FitAI adheres to strict privacy standards, ensuring data is encrypted and user-controlled.

## Data Collection & Security

- **Does your app collect or share any of the required user data types?** Yes
- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS/TLS)
- **Do you provide a way for users to request that their data be deleted?** Yes (Via in-app account deletion)

---

## Data Collection by Category

### Personal Information

| Data Type           | Collected | Shared | Optional | Purpose                               |
| ------------------- | --------- | ------ | -------- | ------------------------------------- |
| Name                | Yes       | No     | Yes      | App functionality                     |
| Email address       | Yes       | No     | No       | Account management                    |
| User IDs            | Yes       | No     | No       | Account management, App functionality |
| Other (Age, Gender) | Yes       | No     | Yes      | Personalization, App functionality    |

### Health & Fitness

| Data Type    | Collected | Shared | Optional | Purpose                            |
| ------------ | --------- | ------ | -------- | ---------------------------------- |
| Health info  | Yes       | No\*   | Yes      | App functionality, Personalization |
| Fitness info | Yes       | No\*   | Yes      | App functionality, Personalization |

_\*Health data is synced with Health Connect on-device if user permits, which may be accessible by other apps the user has authorized._

### Photos and Videos

| Data Type | Collected | Shared | Optional | Purpose                                               |
| --------- | --------- | ------ | -------- | ----------------------------------------------------- |
| Photos    | Yes       | No     | Yes      | App functionality (Progress photos, Food recognition) |

### App Activity

| Data Type                    | Collected | Shared | Optional | Purpose                               |
| ---------------------------- | --------- | ------ | -------- | ------------------------------------- |
| Other user-generated content | Yes       | No     | Yes      | App functionality (Workout/Meal logs) |

### App Info and Performance

| Data Type   | Collected | Shared | Optional | Purpose   |
| ----------- | --------- | ------ | -------- | --------- |
| Crash logs  | Yes       | No     | No       | Analytics |
| Diagnostics | Yes       | No     | No       | Analytics |

### Device or Other IDs

| Data Type           | Collected | Shared | Optional | Purpose                               |
| ------------------- | --------- | ------ | -------- | ------------------------------------- |
| Device or other IDs | Yes       | No     | No       | App functionality (Push tokens, Auth) |

---

## Third-Party Data Handling Disclosures

### Service Providers (Processing only)

The following services are used to process data on behalf of FitAI. They do not use the data for their own independent purposes:

- **Supabase**: Data storage and authentication (Encrypted at rest).
- **Google AI (Gemini)**: Processing health and fitness metrics to generate personalized plans.
- **Cloudflare Workers**: Backend API processing.

### Third-Party Integrations

- **Health Connect (Android)**: User-controlled bidirectional sync of health and fitness data.
- **RevenueCat / Play Store Billing**: Processing of subscription status and purchase history identifiers for payment verification.

---

## Security Practices

- **Encryption in Transit**: All data is transferred over secure HTTPS/TLS connections.
- **Encryption at Rest**: User data stored in Supabase is encrypted at the database level.
- **Account Deletion**: Users can delete their account and all associated data directly within the app settings.
- **Health Connect Compliance**: FitAI follows the "Limited Use" requirements for Health Connect data, ensuring it is never sold or used for advertising/credit scoring.

---

## Purpose Definitions (Google Play Console)

- **App functionality**: Used for core features like workout tracking and meal logging.
- **Account management**: Used for user authentication and profile maintenance.
- **Personalization**: Used by the AI engine to tailor recommendations based on user stats.
- **Analytics**: Used to monitor app stability and performance via crash logs.
