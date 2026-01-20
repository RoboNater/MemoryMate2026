---
name: expo-starter
description: >
  Set up an Expo + React Native + TypeScript development environment with
  NativeWind styling, Expo Router navigation, Zustand state management, and
  SQLite storage. Creates a working starter app for iOS, Android, and Web.
  Use when starting a new cross-platform mobile/web app project, creating
  an Expo project, or setting up React Native development.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# Expo Starter App Setup

## Overview

This skill creates a fully configured Expo + React Native + TypeScript development
environment with:

- **Expo Router** for file-based navigation
- **NativeWind** (Tailwind CSS) for styling
- **Zustand** for state management
- **expo-sqlite** for local storage
- **TypeScript** with strict mode and path aliases
- Support for **iOS, Android, and Web** platforms

## When to Use

Use this skill when:
- Starting a new cross-platform mobile/web application
- Setting up an Expo project with best practices
- Creating a React Native app with TypeScript
- User asks to create an Expo, React Native, or mobile app

## Prerequisites

Before running this skill, ensure:
- Node.js v18+ is installed (`node --version`)
- npm v9+ is installed (`npm --version`)
- The user has specified a project name and location

## Step 1: Gather Project Configuration

Ask the user for:

1. **Project name** - The name for the new project directory
2. **Project location** - Where to create the project (default: current directory)
3. **Include all features** - Whether to include Zustand and SQLite (default: yes)

Use the AskUserQuestion tool:

```
questions:
  - question: "What should the project be named?"
    header: "Project name"
    options:
      - label: "my-expo-app"
        description: "Default project name"
      - label: "Custom name"
        description: "I'll provide a custom name"
    multiSelect: false

  - question: "Which dependencies should be included?"
    header: "Dependencies"
    options:
      - label: "Full stack (Recommended)"
        description: "Expo Router, NativeWind, Zustand, SQLite"
      - label: "Minimal"
        description: "Expo Router and NativeWind only"
    multiSelect: false

  - question: "Which platforms do you want to target?"
    header: "Platforms"
    options:
      - label: "All platforms (Recommended)"
        description: "iOS, Android, and Web"
      - label: "Mobile only"
        description: "iOS and Android (skip web dependencies)"
    multiSelect: false
```

## Step 2: Create Expo Project

Run the following command to create a new Expo project with the TypeScript template:

```bash
npx create-expo-app@latest PROJECT_NAME --template expo-template-blank-typescript
cd PROJECT_NAME
```

Replace `PROJECT_NAME` with the user's chosen project name.

## Step 3: Install Dependencies

**CRITICAL**: Use `--legacy-peer-deps` for npm installs due to React 19 peer dependency conflicts.

### 3.1 Install Expo Router and Navigation

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### 3.2 Install NativeWind and Peer Dependencies

```bash
npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps
npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps
```

### 3.3 Install Web Platform Support (if targeting web)

**CRITICAL**: Pin react-dom to match react version exactly to avoid version mismatch errors.

```bash
# Get the react version and install matching react-dom
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)")
npm install react-dom@$REACT_VERSION react-native-web --legacy-peer-deps
```

### 3.4 Install State Management (if full stack)

```bash
npm install zustand --legacy-peer-deps
```

### 3.5 Install Local Storage (if full stack)

```bash
npx expo install expo-sqlite
```

## Step 4: Update package.json Entry Point

**CRITICAL**: Update the `main` field for Expo Router to work:

Edit `package.json` and change the `main` field to:

```json
{
  "main": "expo-router/entry"
}
```

## Step 5: Configure app.json

Update `app.json` with the following configuration. Use the templates/app.json template and replace placeholders:

- `PROJECT_NAME` - The project name
- `PROJECT_SLUG` - URL-safe project name (lowercase, hyphens)
- `APP_SCHEME` - Deep linking scheme (lowercase, no special chars)

Key configurations:
- `"bundler": "metro"` under `web` is **required** for web platform
- `plugins` must include `"expo-router"` and `"expo-sqlite"` (if using SQLite)

## Step 6: Create Configuration Files

Create the following configuration files from templates:

### 6.1 tailwind.config.js

Copy from `templates/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**CRITICAL**: The `presets: [require("nativewind/preset")]` line is required for NativeWind to work.

### 6.2 babel.config.js

Copy from `templates/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

### 6.3 metro.config.js

Copy from `templates/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

### 6.4 global.css

Copy from `templates/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6.5 nativewind-env.d.ts

Copy from `templates/nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

### 6.6 tsconfig.json

Update `tsconfig.json` with path aliases:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./src/components/*"],
      "@/store/*": ["./src/store/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/constants/*": ["./src/constants/*"]
    }
  }
}
```

## Step 7: Create Project Structure

Create the directory structure:

```bash
mkdir -p src/app
mkdir -p src/components
mkdir -p src/store
mkdir -p src/services
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/constants
```

**IMPORTANT**: Use `src/app/` for Expo Router files, NOT `app/` at the root. Having both causes routing confusion.

## Step 8: Create Starter App Files

### 8.1 Root Layout (src/app/_layout.tsx)

Copy from `templates/app-layout.tsx` and customize the title:

```tsx
import { Stack } from 'expo-router';
import '../../global.css';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'PROJECT_TITLE' }} />
    </Stack>
  );
}
```

Replace `PROJECT_TITLE` with the app name.

### 8.2 Index Page (src/app/index.tsx)

Copy from `templates/app-index.tsx` and customize:

```tsx
import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-blue-600">
        PROJECT_TITLE
      </Text>
      <Text className="mt-4 text-gray-600">
        Your app is ready!
      </Text>
    </View>
  );
}
```

Replace `PROJECT_TITLE` with the app name.

## Step 9: Clean Up

Remove the default `App.tsx` file if it exists (not used with Expo Router):

```bash
rm -f App.tsx
```

Remove any `app/` directory at the root if it exists (conflicts with `src/app/`):

```bash
rm -rf app/
```

## Step 10: Verify Setup

Start the development server:

```bash
npx expo start --clear
```

### Test Web Platform

Press `w` or run:

```bash
npx expo start --web
```

Expected results:
- Browser opens at http://localhost:8081
- App displays the project title in blue
- "Your app is ready!" text is visible
- Tailwind CSS styling is applied (centered, colored text)

### Test Mobile (Optional)

Press `i` for iOS simulator or `a` for Android emulator.

Or scan the QR code with Expo Go on a physical device.

## Verification Checklist

After setup is complete, verify:

- [ ] `npx expo start` runs without errors
- [ ] Web version displays styled content (press `w`)
- [ ] NativeWind styles are visible (blue text, centered layout)
- [ ] No React version mismatch errors in browser console
- [ ] Hot reload works (edit index.tsx, see changes)

## Common Issues and Solutions

### "Cannot find module 'nativewind/preset'"

NativeWind is not installed correctly. Run:
```bash
npm install nativewind --legacy-peer-deps
```

### Blank page on web

Check browser console for errors. Common causes:
1. Missing `"bundler": "metro"` in app.json
2. React/react-dom version mismatch
3. Missing `global.css` import in _layout.tsx

### "Open up App.tsx to start working on your app!"

The entry point is wrong. Ensure `package.json` has:
```json
"main": "expo-router/entry"
```

### React version mismatch error

The react-dom version doesn't match react. Fix:
```bash
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)")
npm install react-dom@$REACT_VERSION --legacy-peer-deps
```

### NativeWind styles not applying

1. Ensure `global.css` is imported in `src/app/_layout.tsx`
2. Verify `tailwind.config.js` has the NativeWind preset
3. Restart with `npx expo start --clear`

### Routes not found

Ensure routes are in `src/app/` not `app/` at root. Remove any duplicate `app/` directory.

## Additional Resources

- See `docs/troubleshooting.md` for detailed issue resolution
- See `docs/customization.md` for extending the setup
- Expo Router documentation: https://docs.expo.dev/router/introduction/
- NativeWind documentation: https://www.nativewind.dev/

## React 19 Note

As of January 2026, Expo SDK 54 pins React to 19.1.0. Some packages haven't updated their peer dependencies for React 19.x, requiring `--legacy-peer-deps`. This is a known limitation that will be resolved in future Expo SDK updates.
