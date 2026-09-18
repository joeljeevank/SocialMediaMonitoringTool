# Google Cloud Console Setup Guide for SocialMediaMonitoring

This guide provides step-by-step instructions to configure Google Cloud Console for the **YouTube Monitoring Dashboard** in this project. Keep this document handy if you need to reconfigure credentials, add new testers, or deploy to a new environment.

---

## 📑 Table of Contents
1. [Architecture & Credentials Overview](#1-architecture--credentials-overview)
2. [Step 1: Create or Select Google Cloud Project](#step-1-create-or-select-google-cloud-project)
3. [Step 2: Enable Required YouTube APIs](#step-2-enable-required-youtube-apis)
4. [Step 3: Generate the YouTube Data API Key](#step-3-generate-the-youtube-data-api-key)
5. [Step 4: Configure OAuth Consent Screen (Crucial for 403 Error)](#step-4-configure-oauth-consent-screen-crucial-for-403-error)
6. [Step 5: Create OAuth 2.0 Client ID & Secret](#step-5-create-oauth-20-client-id--secret)
7. [Step 6: Update `backend/.env` Configuration](#step-6-update-backendenv-configuration)
8. [Step 7: Verification & Testing Checklist](#step-7-verification--testing-checklist)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## 1. Architecture & Credentials Overview

Our system uses two different Google credentials, each serving a distinct purpose:

| Credential | Purpose | What Data It Provides |
| :--- | :--- | :--- |
| **YouTube Data API Key** (`YOUTUBE_API_KEY`) | Powers the **Track Channel** feature for any public YouTube channel. | Public subscriber counts, lifetime views, video lists, titles, tags, publish dates, public likes, and comment counts. |
| **Google OAuth 2.0** (`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`) | Authenticates **your personal YouTube channel** via Google Sign-In. | Private studio analytics: exact watch hours/minutes, audience retention curves, traffic sources, demographics, and daily subscriber churn. |

---

## Step 1: Create or Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navbar, click the **Project Dropdown**.
3. Click **New Project**:
   * **Project name**: `SocialMediaMonitoring` (or your preferred name).
   * **Organization**: No organization (or your personal account).
4. Click **Create** and ensure this project is selected in the top bar.

---

## Step 2: Enable Required YouTube APIs

Before credentials can fetch data, you must activate the specific YouTube APIs:

1. In the left navigation menu, click **APIs & Services** &rarr; **Library**.
2. Search for and **Enable** each of the following three APIs:
   * **YouTube Data API v3** *(Required for channel tracking, video metadata, and stats)*
   * **YouTube Analytics API** *(Required for watch time, audience metrics, and retention)*
   * **YouTube Reporting API** *(Optional, for scheduled reports)*

---

## Step 3: Generate the YouTube Data API Key

1. Go to **APIs & Services** &rarr; **Credentials**.
2. Click **+ CREATE CREDENTIALS** &rarr; select **API key**.
3. A modal will pop up with your new API key (starts with `AIzaSy...`).
4. Copy this key.
5. *(Optional Best Practice)*:
   * Click **Edit API Key**.
   * Under **API restrictions**, select **Restrict key** &rarr; choose **YouTube Data API v3**.
   * Click **Save**.

---

## Step 4: Configure OAuth Consent Screen (Crucial for 403 Error)

> [!IMPORTANT]
> Google puts newly created apps into **"Testing"** mode. If you do not add your Google account under **"Test users"**, Google will block login attempts with:  
> **`Error 403: access_denied - SocialMedaiMonitoring has not completed the Google verification process`**.

1. In the left sidebar, click **APIs & Services** &rarr; **OAuth consent screen** (or **Audience** in newer UI).
2. **User Type**: Select **External** &rarr; click **Create**.
3. **App Information**:
   * **App name**: `SocialMediaMonitoring`
   * **User support email**: Your email (e.g. `joeljeevank@gmail.com`)
   * **Developer contact email**: Your email
   * Click **Save and Continue**.
4. **Scopes**:
   * Click **Add or Remove Scopes**.
   * Add:
     * `.../auth/youtube.readonly` (View YouTube account)
     * `.../auth/yt-analytics.readonly` (View YouTube Analytics reports)
   * Click **Update** &rarr; click **Save and Continue**.
5. **Test Users (CRITICAL)**:
   * Under **Test users**, click **+ ADD USERS**.
   * Enter the Google/Gmail address you intend to log in with (e.g. `joeljeevank@gmail.com`).
   * Click **Save**.
   * Click **Save and Continue** &rarr; **Back to Dashboard**.

*(Alternative)*: You can also click **"Publish App"** on the OAuth consent screen to move it to Production. Google will display an "Unverified App" warning during login, which you can bypass by clicking *Advanced &rarr; Go to SocialMediaMonitoring (unsafe)*.

---

## Step 5: Create OAuth 2.0 Client ID & Secret

1. Go to **APIs & Services** &rarr; **Credentials**.
2. Click **+ CREATE CREDENTIALS** &rarr; select **OAuth client ID**.
3. Fill in the fields:
   * **Application type**: **Web application**
   * **Name**: `SocialMediaMonitoring Web Client`
   * **Authorized JavaScript origins**:
     * `http://localhost:3000`
     * `http://localhost:3001`
   * **Authorized redirect URIs (MUST MATCH EXACTLY)**:
     * `http://localhost:3001/api/youtube/auth/callback`
4. Click **Create**.
5. A popup will display:
   * **Client ID** (ends with `.apps.googleusercontent.com`)
   * **Client Secret** (starts with `GOCSPX-...`)
6. Copy both values.

---

## Step 6: Update `backend/.env` Configuration

Open `backend/.env` and paste your credentials into lines 16–19:

```env
# Google / YouTube OAuth & API Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/youtube/auth/callback
YOUTUBE_API_KEY=AIzaSyYourApiKeyHere
```

Save the file. The backend automatically reads these settings when executing API and OAuth requests.

---

## Step 7: Verification & Testing Checklist

Once configured, verify the system:

1. **Verify Backend Config**:
   * Open: `http://localhost:3001/api/youtube/config`
   * Expected response:
     ```json
     {
       "oauthConfigured": true,
       "apiKeyConfigured": true,
       "redirectUri": "http://localhost:3001/api/youtube/auth/callback",
       "clientId": "430864958324-1gf...",
       "maskedApiKey": "AIza...2iDY"
     }
     ```
2. **Test Channel Identifier Tracking**:
   * Open [http://localhost:3000/dashboard/youtube](http://localhost:3000/dashboard/youtube).
   * Click **Connect Channel** &rarr; enter any `@handle` (e.g. `@mkbhd` or `@YourHandle`).
   * Click **Track Channel**. Real-time subscribers and video counts should immediately populate.
3. **Test Google OAuth 2.0**:
   * Click **Connect Channel** &rarr; switch to **Google OAuth 2.0** tab.
   * Click **Sign in with Google OAuth** and authenticate with your registered test user account.

---

## Troubleshooting Common Issues

### 1. `Error 403: access_denied` / App not verified
* **Cause**: Your app is in "Testing" mode and the login email is not in the Test Users list.
* **Fix**: Go to **Google Cloud Console &rarr; OAuth consent screen &rarr; Test users &rarr; + ADD USERS** &rarr; add your Gmail &rarr; **Save**.

### 2. `Error 400: redirect_uri_mismatch`
* **Cause**: The redirect URI passed in the login URL doesn't exactly match the one in Google Cloud Console.
* **Fix**: Ensure `http://localhost:3001/api/youtube/auth/callback` is listed under **Authorized redirect URIs** in Google Cloud Console. Make sure there are no trailing slashes.

### 3. `API key not valid` or `YouTube Data API v3 has not been used in project...`
* **Cause**: The YouTube Data API v3 is not enabled or the API key has a typo.
* **Fix**: In Google Cloud Console, visit **APIs & Services &rarr; Library &rarr; search "YouTube Data API v3" &rarr; click Enable**.

### 4. `quotaExceeded` (HTTP 403)
* **Cause**: Google's free quota limit of 10,000 units per day was reached.
* **Fix**: The quota automatically resets at **midnight Pacific Time (PT)**. Avoid spamming video sync requests repeatedly in a short period.
