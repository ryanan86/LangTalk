# TapTalk iOS Build Guide

## Prerequisites
- macOS with Xcode installed (15.0+)
- CocoaPods (`sudo gem install cocoapods`)
- Node.js 18+ and npm

## Initial Setup (First Time Only)

### 1. Install Dependencies
```bash
cd /path/to/langtalk
npm install
```

### 2. Install CocoaPods
```bash
cd ios/App
pod install
```
If `pod install` fails, try:
```bash
pod repo update
pod install
```

### 3. Open in Xcode
```bash
open ios/App/App.xcworkspace
```
**IMPORTANT**: Always open `.xcworkspace`, NOT `.xcodeproj`.

### 4. Configure Signing
1. In Xcode, select the **App** target
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (Apple Developer account)
4. Set **Bundle Identifier**: `com.taptalk.app`
5. Xcode will auto-create provisioning profiles

### 5. Configure Google Sign-In (iOS)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the TapTalk project
3. Create an **iOS OAuth client ID** with bundle ID `com.taptalk.app`
4. Download `GoogleService-Info.plist`
5. Add it to `ios/App/App/` in Xcode

## Build & Run

### Sync Web Assets (after web code changes)
```bash
# From project root
npx cap sync ios
```

### Run on Simulator
1. Open `App.xcworkspace` in Xcode
2. Select a simulator (iPhone 15 Pro recommended)
3. Press **Cmd+R** to build and run

### Run on Physical Device
1. Connect iPhone via USB
2. Select the device in Xcode
3. Trust the developer certificate on the device (Settings > General > VPN & Device Management)
4. Press **Cmd+R**

### Build for Distribution (TestFlight / App Store)
1. Select **Any iOS Device** as target
2. Product > Archive
3. In Organizer, select the archive > Distribute App
4. Follow App Store Connect upload steps

## Project Configuration

| Setting | Value |
|---------|-------|
| Bundle ID | `com.taptalk.app` |
| Display Name | TapTalk |
| Min iOS Version | 13.0 |
| Scheme | TapTalk |
| Web URL | https://taptalk.xyz |

## Permissions Used
- **Microphone** (NSMicrophoneUsageDescription): Voice recording for English conversation practice
- **Speech Recognition** (NSSpeechRecognitionUsageDescription): Converting speech to text
- **Push Notifications**: Lesson reminders and updates

## Capacitor Plugins
- `@capacitor/splash-screen` - Launch screen
- `@capacitor/status-bar` - Status bar control
- `@capacitor/local-notifications` - Local notification scheduling
- `@capacitor/push-notifications` - Remote push notifications
- `@codetrix-studio/capacitor-google-auth` - Google Sign-In

## Troubleshooting

### Pod install fails
```bash
cd ios/App
pod deintegrate
pod install
```

### Build fails with signing error
- Ensure Apple Developer account is added in Xcode > Settings > Accounts
- Check Bundle ID matches `com.taptalk.app`

### White screen after launch
- Run `npx cap sync ios` to ensure latest web assets are copied
- Check `capacitor.config.ts` server URL is correct

### Google Sign-In not working
- Verify `GoogleService-Info.plist` is in the App target
- Check URL schemes are configured in Info.plist
- Ensure iOS OAuth client is created in Google Cloud Console
