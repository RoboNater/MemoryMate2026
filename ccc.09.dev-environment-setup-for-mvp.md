# Development Environment Setup - Memory Mate MVP

This document records the setup process for the Memory Mate MVP development environment.

---

## System Information

**Date**: 2026-01-17
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

```bash
# Navigation (Expo Router)
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Styling (NativeWind - Tailwind CSS for React Native)
npm install nativewind
npm install --save-dev tailwindcss@3.3.2

# State Management (Zustand)
npm install zustand

# Local Storage (SQLite)
npx expo install expo-sqlite

# Additional utilities
npx expo install react-native-reanimated
```

### 3. Configure Expo Router

Update `app.json` to enable Expo Router:

```json
{
  "expo": {
    "scheme": "memorymate",
    "plugins": [
      "expo-router"
    ]
  }
}
```

### 4. Configure NativeWind

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
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

### 5. Configure TypeScript

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

### 6. Setup Project Structure

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

Move Expo Router app files:

```bash
# Move App.tsx to app/_layout.tsx if needed
# This will be done as part of implementation
```

---

## Development Tools Setup

### 1. ESLint Configuration

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
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
npm install --save-dev prettier
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

### Run on Platforms

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web Browser
npx expo start --web

# Scan QR code with Expo Go app for physical device testing
```

---

## Verification Steps (CP-1)

### ✅ Checklist

- [ ] Node.js and npm installed and working
- [ ] Expo project created successfully
- [ ] All dependencies installed without errors
- [ ] Project structure created
- [ ] TypeScript compilation works
- [ ] Development server starts successfully
- [ ] App runs on iOS simulator/device
- [ ] App runs on Android emulator/device
- [ ] App runs in web browser
- [ ] Hot reload works (make a change, see it update)

---

## Implementation Notes

### Dependency Installation
- Used `--legacy-peer-deps` flag when installing `nativewind` and `zustand` due to React version peer dependency conflicts
- This is a known issue with React 19 and some packages; functionality is not affected

### Project Structure
- Created `app/` directory for Expo Router (file-based routing)
- Created `src/` directory for organized code structure
- Both App.tsx (original) and app/ directory coexist; Expo Router takes precedence

### Configuration Files Created
- `tailwind.config.js` - Tailwind CSS configuration
- `metro.config.js` - Metro bundler with NativeWind integration
- `global.css` - Tailwind directives
- `nativewind-env.d.ts` - TypeScript support for NativeWind
- `.prettierrc` - Code formatting rules
- Updated `tsconfig.json` - Added path aliases
- Updated `app.json` - Added scheme for deep linking

## Troubleshooting

### Common Issues

**Issue**: `expo-router` not found
- **Solution**: Ensure `expo-router` is installed: `npx expo install expo-router`

**Issue**: Metro bundler cache issues
- **Solution**: Clear cache: `npx expo start --clear`

**Issue**: TypeScript errors
- **Solution**: Run `npx tsc --noEmit` to check for type errors

**Issue**: NativeWind styles not applying
- **Solution**: Ensure `global.css` is imported in root layout

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
- tailwindcss: ^3.3.2

### State & Storage
- zustand: ^5.0.10
- expo-sqlite: ~16.0.10

### Development Tools
- typescript: ~5.9.2
- @types/react: ~19.1.0
- @types/react-native: (included with React Native types)

---

## Next Steps

After CP-1 approval:
1. Proceed to Phase 2: Navigation & Screen Shells
2. Create tab navigation structure
3. Build placeholder screens

---

**Document Version**: 1.0
**Created**: 2026-01-17
**Last Updated**: 2026-01-17
