# Expo React Native iOS Deployment Guide

## Overview

This guide covers deploying your Expo + React Native + TypeScript app to an iPhone, from standalone testing to App Store submission.

---

## Quick Comparison: Deployment Options

### Web Browser (Current)
- ✅ Free
- ✅ Instant testing
- ❌ Requires PC + Expo server running
- ❌ Not true native app experience

### Development Build (Standalone Testing)
- ✅ Runs standalone on device (no PC needed)
- ✅ Full native app experience
- ⚠️ Requires Apple Developer account ($99/year)
- ⚠️ Limited to 100 devices per year
- ✅ 90-day TestFlight installs (renewable)

### App Store Release
- ✅ Public distribution
- ✅ Professional deployment
- ❌ $99/year Apple Developer account
- ❌ App review process (1-7 days)
- ❌ Ongoing maintenance commitment

---

## Cost Summary

| Item | Cost | Required For |
|------|------|--------------|
| Apple Developer Program | $99/year | Development builds, TestFlight, App Store |
| Expo (Free Tier) | $0 | 30 iOS builds/month - sufficient for most solo devs |
| Expo (Paid Tier) | $29/month | Faster builds, more builds/month, team features |

**Minimum to test standalone on your iPhone:** $99/year (Apple only)

---

## Development Build Process (Standalone Testing)

### Prerequisites

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Apple Developer Account**
   - Sign up at: https://developer.apple.com/programs/
   - Cost: $99/year
   - Required for device installation outside Expo Go

### Step 1: Configure Your App

#### Update `app.json` (or `app.config.js`)

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.yourapp",
      "supportsTablet": true,
      "buildNumber": "1"
    },
    "plugins": [],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

**Key fields:**
- `bundleIdentifier`: Must be unique (reverse domain format)
- `version`: User-facing version (1.0.0)
- `buildNumber`: Internal build number (increment for each build)

**Documentation:** https://docs.expo.dev/versions/latest/config/app/

#### Create App Icons & Splash Screen

**Icon Requirements:**
- Size: 1024×1024 px
- Format: PNG (no transparency)
- Path: `./assets/icon.png`

**Splash Screen Requirements:**
- Size: 2048×2048 px or larger (centered content)
- Format: PNG
- Path: `./assets/splash.png`

**Tools:**
- Figma, Canva, or any design tool
- Icon generators: https://www.appicon.co/ or https://icon.kitchen/

**Documentation:** https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/

### Step 2: Initialize EAS

```bash
eas build:configure
```

This creates `eas.json` with build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "default"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "default"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "default"
      }
    }
  }
}
```

**Documentation:** https://docs.expo.dev/build/eas-json/

### Step 3: Register iOS Device

You need your iPhone's UDID (Unique Device Identifier).

**Get UDID:**
1. Connect iPhone to computer
2. Open Finder (Mac) or iTunes (Windows)
3. Click on device, find UDID
4. Or use: https://udid.tech/ (open on iPhone)

**Register device:**
```bash
eas device:create
```

Follow prompts to add your device UDID.

**Documentation:** https://docs.expo.dev/build/internal-distribution/

### Step 4: Build for iOS

**Development build** (includes dev tools, faster iteration):
```bash
eas build --platform ios --profile development
```

**Preview build** (closer to production):
```bash
eas build --platform ios --profile preview
```

**What happens:**
- Code uploaded to Expo servers
- Built on Expo's infrastructure
- Generates `.ipa` file
- Free tier: 30 builds/month

**Build time:** 10-30 minutes typically

**Documentation:** https://docs.expo.dev/build/setup/

### Step 5: Install on Device

After build completes, you'll get:
1. Download link for `.ipa` file
2. QR code for direct installation

**Installation methods:**

**Option A: Direct Install (Easiest)**
- Open the provided URL on your iPhone
- Tap "Install"
- Trust the developer certificate in Settings

**Option B: TestFlight (More reliable)**
- Upload build to TestFlight (see below)
- Install via TestFlight app

**Documentation:** https://docs.expo.dev/build/internal-distribution/#installing-your-build

---

## TestFlight Distribution (Recommended for Testing)

TestFlight is Apple's official beta testing platform. More reliable than ad-hoc distribution.

### Setup

1. **Create App in App Store Connect**
   - Go to: https://appstoreconnect.apple.com/
   - Click "My Apps" → "+" → "New App"
   - Fill in basic info (doesn't commit you to App Store release)

2. **Build with Production Profile**
   ```bash
   eas build --platform ios --profile production
   ```

3. **Submit to TestFlight**
   ```bash
   eas submit --platform ios
   ```
   
   Or manually upload `.ipa` through App Store Connect or Xcode.

4. **Install TestFlight App**
   - Download from App Store: https://apps.apple.com/app/testflight/id899247664

5. **Add Yourself as Tester**
   - In App Store Connect → TestFlight
   - Add your email as internal tester
   - Receive invite email
   - Open in TestFlight app

**Benefits:**
- 90-day installs (auto-renewable)
- Up to 10,000 external testers
- Crash reports and feedback
- No device UDID registration needed
- More reliable than ad-hoc distribution

**Documentation:** 
- https://docs.expo.dev/submit/ios/
- https://developer.apple.com/testflight/

---

## App Store Submission (Full Release)

If you decide to release publicly:

### Requirements

1. **App Store Connect Listing**
   - Screenshots (multiple iPhone sizes required)
   - App description (4000 chars max)
   - Keywords
   - Privacy policy URL (required)
   - Age rating
   - Category
   - Support URL

2. **Screenshot Sizes Needed:**
   - 6.7" (iPhone 14 Pro Max): 1290×2796
   - 6.5" (iPhone 11 Pro Max): 1242×2688
   - 5.5" (iPhone 8 Plus): 1242×2208

   **Tool:** Use iOS Simulator or https://appscreenshots.io/

3. **Privacy Policy**
   - Required by Apple
   - Must be hosted publicly (your website, GitHub Pages, etc.)
   - Generators: https://www.freeprivacypolicy.com/

### Submission Process

1. **Build Production Version**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

3. **Complete App Store Connect Listing**
   - Add all metadata
   - Upload screenshots
   - Set pricing (free or paid)
   - Submit for review

4. **App Review**
   - Typically 1-3 days
   - Can take up to 7 days
   - Apple tests functionality, content, compliance
   - Common rejections: crashes, missing privacy info, incomplete metadata

5. **Release**
   - Manual release (you control timing)
   - Or automatic release after approval

**Documentation:**
- https://docs.expo.dev/submit/ios/
- https://developer.apple.com/app-store/review/guidelines/

---

## Ongoing Maintenance

### Updates

1. Increment version numbers in `app.json`:
   ```json
   "version": "1.0.1",
   "ios": {
     "buildNumber": "2"
   }
   ```

2. Build and submit:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

3. TestFlight: Automatically available
4. App Store: Submit for review again

### Build Limits (Free Tier)

- 30 iOS builds per month
- Usually sufficient for:
  - Initial launch
  - Monthly/quarterly updates
  - Small bug fixes

**Upgrade to paid ($29/mo) if:**
- Frequent updates (>30 builds/month)
- Team collaboration needed
- Priority build queue desired

---

## Useful Commands Reference

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Initialize EAS in project
eas build:configure

# Register device for internal distribution
eas device:create

# Build for development (with dev tools)
eas build --platform ios --profile development

# Build for production (optimized)
eas build --platform ios --profile production

# Submit to App Store/TestFlight
eas submit --platform ios

# Check build status
eas build:list

# View project info
eas project:info
```

---

## Troubleshooting

### Build Fails

- Check `eas.json` configuration
- Verify `app.json` bundle identifier is unique
- Check build logs: `eas build:list` → click build link

### Installation Fails

- Verify device UDID is registered
- Check Apple Developer account is active
- Try TestFlight instead of direct install

### App Crashes

- Check native dependencies compatibility
- Test in development build with debugging enabled
- Review crash logs in Xcode or App Store Connect

---

## Key Resources

### Documentation
- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **App Configuration:** https://docs.expo.dev/versions/latest/config/app/
- **Apple Developer:** https://developer.apple.com/documentation/

### Communities
- **Expo Forums:** https://forums.expo.dev/
- **Expo Discord:** https://chat.expo.dev/
- **Stack Overflow:** Tag `expo` or `react-native`

### Tools
- **App Store Connect:** https://appstoreconnect.apple.com/
- **Apple Developer Portal:** https://developer.apple.com/account/
- **Expo Dashboard:** https://expo.dev/

---

## Decision Framework

### Is $99/year worth it for you?

**Worth it if:**
- You'll use the app regularly for personal use
- You want to share with friends/family (TestFlight)
- You're serious about learning mobile development
- You might publish eventually

**Not worth it if:**
- Just experimenting/learning (web browser sufficient)
- One-time project you won't maintain
- Unsure about long-term use

**Alternative:** Continue testing in web browsers until you're confident the app is worth deploying natively.

---

## Quick Start Checklist

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Sign up for Apple Developer Program ($99/year)
- [ ] Update `app.json` with bundle identifier, version, icons
- [ ] Create app icon (1024×1024) and splash screen
- [ ] Run `eas build:configure`
- [ ] Get iPhone UDID and register device: `eas device:create`
- [ ] Build: `eas build --platform ios --profile development`
- [ ] Install on device from provided link
- [ ] (Optional) Set up TestFlight for more reliable testing

---

## Summary

**Minimal path to standalone iPhone app:**
1. Pay $99 for Apple Developer account
2. Configure app.json and add icons
3. Build with EAS (free tier)
4. Install on your device

**Time estimate:** 2-4 hours first time (including Apple account setup)

**Ongoing:** Free with Expo (30 builds/month sufficient for personal projects)

Good luck with your deployment!
