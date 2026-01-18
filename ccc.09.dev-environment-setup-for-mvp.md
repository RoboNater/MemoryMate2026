# Development Environment Setup - Memory Mate MVP

This document records the setup process for the Memory Mate MVP development environment.

**IMPORTANT**: See [ccc.12.web-expo-react-issues.md](ccc.12.web-expo-react-issues.md) for detailed troubleshooting of issues encountered during initial setup.

---

## System Information

**Date**: 2026-01-17 (updated 2026-01-18)
**Platform**: Linux (WSL2)
**OS Version**: Linux 6.6.87.2-microsoft-standard-WSL2
**Node.js Version**: v24.11.1
**npm Version**: 11.6.4

---

## Prerequisites Verification

### Check Node.js and npm

```bash
node --version
npm --version
```

### Check if Expo CLI is available

```bash
npx expo --version
```

---

## Project Initialization

### 1. Create Expo Project with TypeScript Template

```bash
# Create new Expo app with TypeScript template
npx create-expo-app@latest memory-mate-mvp --template expo-template-blank-typescript

# Navigate to project directory
cd memory-mate-mvp
```

### 2. Install Core Dependencies

**IMPORTANT**: Use `--legacy-peer-deps` for all npm installs due to React 19 peer dependency conflicts. See [ccc.11.react-19-dependency-conflicts.md](ccc.11.react-19-dependency-conflicts.md) for details.

```bash
# Navigation (Expo Router)
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Styling (NativeWind - Tailwind CSS for React Native)
# IMPORTANT: Install ALL peer dependencies together
npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps
npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps

# Web platform support (required for web builds)
# IMPORTANT: Pin react-dom to match react version exactly
npm install react-dom@19.1.0 react-native-web --legacy-peer-deps

# State Management (Zustand)
npm install zustand --legacy-peer-deps

# Local Storage (SQLite)
npx expo install expo-sqlite
```

### 3. Update package.json Entry Point

**CRITICAL**: Update the `main` field for Expo Router:

```json
{
  "main": "expo-router/entry"
}
```

### 4. Configure Expo Router

Update `app.json` to enable Expo Router and web support:

```json
{
  "expo": {
    "scheme": "memorymate",
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-sqlite"
    ]
  }
}
```

### 5. Configure NativeWind

Create `tailwind.config.js`:

```js
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

Create `babel.config.js`:

```js
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

Create `metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

Create `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. Configure TypeScript

Update `tsconfig.json` to support path aliases:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Create `nativewind-env.d.ts` for TypeScript support:

```ts
/// <reference types="nativewind/types" />
```

### 7. Setup Project Structure

**IMPORTANT**: Use `src/app/` for Expo Router files (not `app/` at root).

```bash
# Create directory structure
mkdir -p src/app/(tabs)
mkdir -p src/components
mkdir -p src/store
mkdir -p src/services
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/constants
```

### 8. Create Root Layout

Create `src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import '../../global.css';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Memory Mate' }} />
    </Stack>
  );
}
```

### 9. Create Index Page

Create `src/app/index.tsx`:

```tsx
import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-blue-600">
        Memory Mate MVP
      </Text>
      <Text className="mt-4 text-gray-600">
        Phase 1: Project Setup Complete
      </Text>
    </View>
  );
}
```

---

## Development Tools Setup

### 1. ESLint Configuration

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --legacy-peer-deps
```

Create `.eslintrc.js`:

```js
module.exports = {
  extends: ['expo', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error'],
  },
};
```

### 2. Prettier Configuration

```bash
npm install --save-dev prettier --legacy-peer-deps
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## Running the App

### Start Development Server

```bash
npx expo start
```

Use `--clear` flag after configuration changes:

```bash
npx expo start --clear
```

### Run on Platforms

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web Browser (press 'w' after starting, or use --web flag)
npx expo start --web

# Scan QR code with Expo Go app for physical device testing
```

---

## Verification Steps (CP-1)

### Checklist

- [x] Node.js and npm installed and working
- [x] Expo project created successfully
- [x] All dependencies installed (with --legacy-peer-deps)
- [x] Project structure created
- [x] TypeScript compilation works
- [x] Development server starts successfully
- [ ] App runs on iOS simulator/device
- [ ] App runs on Android emulator/device
- [x] App runs in web browser
- [ ] Hot reload works (make a change, see it update)

---

## Implementation Notes

### Dependency Installation
- Used `--legacy-peer-deps` flag for ALL npm installs due to React 19 peer dependency conflicts
- This is a known issue with React 19 and some packages; functionality is not affected
- See [ccc.11.react-19-dependency-conflicts.md](ccc.11.react-19-dependency-conflicts.md) for details

### Critical Configuration Points
1. **package.json main field**: Must be `"expo-router/entry"` for Expo Router
2. **app.json web.bundler**: Must be `"metro"` for web platform
3. **tailwind.config.js**: Must include `presets: [require("nativewind/preset")]`
4. **babel.config.js**: Must include NativeWind and reanimated plugins
5. **react-dom version**: Must match react version exactly (19.1.0)

### Project Structure
- Routes are in `src/app/` directory (Expo Router file-based routing)
- Created `src/` directory for organized code structure
- Original `App.tsx` can be deleted (not used with Expo Router)

### Configuration Files Created
- `tailwind.config.js` - Tailwind CSS configuration with NativeWind preset
- `babel.config.js` - Babel configuration with NativeWind and reanimated
- `metro.config.js` - Metro bundler with NativeWind integration
- `global.css` - Tailwind directives
- `nativewind-env.d.ts` - TypeScript support for NativeWind
- `.prettierrc` - Code formatting rules
- Updated `tsconfig.json` - Added path aliases
- Updated `app.json` - Added scheme, web bundler, and plugins
- Updated `package.json` - Changed main to expo-router/entry

## Troubleshooting

### Common Issues

**Issue**: `expo-router` not found
- **Solution**: Ensure `expo-router` is installed: `npx expo install expo-router`

**Issue**: Metro bundler cache issues
- **Solution**: Clear cache: `npx expo start --clear`

**Issue**: TypeScript errors
- **Solution**: Run `npx tsc --noEmit` to check for type errors

**Issue**: NativeWind styles not applying
- **Solution**: Ensure `global.css` is imported in root layout, and tailwind.config.js has NativeWind preset

**Issue**: Blank page on web
- **Solution**: Check browser console for errors. See [ccc.12.web-expo-react-issues.md](ccc.12.web-expo-react-issues.md)

**Issue**: React/react-dom version mismatch
- **Solution**: Pin react-dom to match react: `npm install react-dom@19.1.0 --legacy-peer-deps`

**Issue**: "Open up App.tsx" showing instead of app content
- **Solution**: Ensure package.json has `"main": "expo-router/entry"`

**Issue**: Boilerplate showing instead of custom content
- **Solution**: Ensure routes are in `src/app/` not `app/` at root

---

## Installed Packages (Final List)

### Core Dependencies
- expo: ~54.0.31
- expo-router: ~6.0.21
- react: 19.1.0
- react-native: 0.81.5

### Navigation
- react-native-safe-area-context: ~5.6.0
- react-native-screens: ~4.16.0
- expo-linking: ~8.0.11
- expo-constants: ~18.0.13
- expo-status-bar: ~3.0.9

### Styling
- nativewind: ^4.2.1
- tailwindcss: ^3.4.17

### Animation (NativeWind peer dependency)
- react-native-reanimated: ~4.1.1
- react-native-worklets: ^0.7.2

### Web Platform
- react-dom: 19.1.0
- react-native-web: ^0.21.2

### State & Storage
- zustand: ^5.0.10
- expo-sqlite: ~16.0.10

### Development Tools
- typescript: ~5.9.2
- @types/react: ~19.1.0
- babel-preset-expo: ^54.0.9

---

## Next Steps

After CP-1 approval:
1. Proceed to Phase 2: Navigation & Screen Shells
2. Create tab navigation structure
3. Build placeholder screens

---

**Document Version**: 2.0
**Created**: 2026-01-17
**Last Updated**: 2026-01-18
