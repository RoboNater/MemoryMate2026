# Troubleshooting Guide

This document covers common issues encountered when setting up Expo + React Native + TypeScript projects with NativeWind styling.

## Quick Reference

| Issue | Solution |
|-------|----------|
| Blank page on web | Check `app.json` has `"bundler": "metro"` under `web` |
| React version mismatch | Pin react-dom to match react version exactly |
| NativeWind styles not working | Verify NativeWind preset in tailwind.config.js |
| "Open up App.tsx" message | Set `"main": "expo-router/entry"` in package.json |
| Routes not found | Use `src/app/` directory, not `app/` at root |

---

## Issue 1: Blank Page on Web

### Symptoms
- Web browser opens but shows a blank white page
- No errors in terminal
- Mobile platforms may work fine

### Causes
1. Missing Metro bundler configuration for web
2. Missing web dependencies (react-dom, react-native-web)
3. React/react-dom version mismatch

### Solutions

**Check app.json web configuration:**
```json
{
  "expo": {
    "web": {
      "bundler": "metro"
    }
  }
}
```

**Verify web dependencies are installed:**
```bash
npm list react-dom react-native-web
```

If missing, install:
```bash
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)")
npm install react-dom@$REACT_VERSION react-native-web --legacy-peer-deps
```

---

## Issue 2: React/React-DOM Version Mismatch

### Symptoms
Browser console shows:
```
Uncaught Error: Incompatible React versions: The "react" and "react-dom" packages must have the exact same version.
```

### Cause
The react-dom version doesn't match the react version pinned by Expo.

### Solution
Pin react-dom to match react exactly:

```bash
# Check current react version
npm list react

# Install matching react-dom
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)")
npm install react-dom@$REACT_VERSION --legacy-peer-deps
```

For Expo SDK 54, this is typically:
```bash
npm install react-dom@19.1.0 --legacy-peer-deps
```

---

## Issue 3: NativeWind Styles Not Applying

### Symptoms
- App renders but without Tailwind CSS styling
- `className` props have no effect
- Console may show warnings about NativeWind

### Causes
1. Missing NativeWind preset in tailwind.config.js
2. Missing global.css import in root layout
3. Missing metro.config.js NativeWind integration
4. Missing peer dependencies

### Solutions

**Verify tailwind.config.js has the preset:**
```javascript
module.exports = {
  content: [...],
  presets: [require("nativewind/preset")],  // REQUIRED
  theme: { extend: {} },
  plugins: [],
}
```

**Verify global.css is imported in _layout.tsx:**
```tsx
import '../../global.css';  // Adjust path as needed
```

**Verify metro.config.js:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Install missing peer dependencies:**
```bash
npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps
npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps
```

**Clear cache and restart:**
```bash
npx expo start --clear
```

---

## Issue 4: "Open up App.tsx to start working on your app!"

### Symptoms
- Web shows the default Expo template message
- Your custom content doesn't appear
- Terminal shows no errors

### Cause
The entry point in package.json is not configured for Expo Router.

### Solution
Update package.json:
```json
{
  "main": "expo-router/entry"
}
```

Then restart:
```bash
npx expo start --clear
```

---

## Issue 5: Routes Not Found / Wrong Content Showing

### Symptoms
- Boilerplate content appears instead of your routes
- 404 errors for routes that should exist
- Expo Router can't find pages

### Causes
1. Routes are in wrong directory
2. Both `app/` and `src/app/` exist (Expo prioritizes `src/app/`)

### Solution

Expo Router looks for routes in this order:
1. `src/app/` (preferred)
2. `app/`

**Use only ONE directory for routes:**

```bash
# If using src/app/ (recommended), remove app/ at root
rm -rf app/

# Ensure routes are in src/app/
ls src/app/
# Should show: _layout.tsx, index.tsx, etc.
```

---

## Issue 6: Missing Module Errors During Build

### Symptoms
Errors like:
```
Cannot find module 'babel-preset-expo'
Cannot find module 'react-native-worklets/plugin'
Cannot find module 'nativewind/preset'
```

### Cause
When using `--legacy-peer-deps`, npm doesn't warn about missing peer dependencies. You must manually install them.

### Solution

**Install all required dependencies:**

```bash
# NativeWind and its peer dependencies
npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps

# Dev dependencies
npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps
```

---

## Issue 7: Metro Bundler Cache Issues

### Symptoms
- Changes not appearing after saving files
- Old errors persisting after fixes
- Inconsistent behavior

### Solution
Clear the cache and restart:

```bash
# Clear Metro cache
npx expo start --clear

# If that doesn't work, try:
rm -rf node_modules/.cache
npx expo start --clear

# Nuclear option - reinstall everything
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Issue 8: TypeScript Errors in node_modules

### Symptoms
TypeScript errors in library type definitions, like:
```
node_modules/@react-navigation/... Type errors
```

### Cause
Some packages haven't updated their type definitions for React 19.

### Solution
These errors don't affect runtime. To suppress them in your IDE:

1. The errors are in library code, not your code
2. They don't prevent the app from running
3. They will be fixed in future package updates

If they're annoying, you can add to tsconfig.json:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

## Issue 9: Web Hot Reload Not Working

### Symptoms
- Changes to files don't automatically update in browser
- Need to manually refresh page

### Solutions

1. **Check that Fast Refresh is enabled** - Look for "[Fast Refresh]" in terminal

2. **Try a full refresh** - Sometimes needed after config changes

3. **Check for syntax errors** - Errors can break hot reload

4. **Restart dev server:**
   ```bash
   # Kill the server (Ctrl+C) and restart
   npx expo start --clear
   ```

---

## Issue 10: Peer Dependency Warnings

### Symptoms
npm shows warnings about peer dependencies not being met.

### Context
This is expected with React 19 and Expo SDK 54. Many packages haven't updated their peer dependency ranges.

### Solution
Use `--legacy-peer-deps` for all npm installs:
```bash
npm install PACKAGE --legacy-peer-deps
```

This is a workaround until packages update their peer dependencies for React 19.

**Important**: When using `--legacy-peer-deps`, you must manually verify and install peer dependencies since npm won't warn you about missing ones.

---

## Getting Help

If none of these solutions work:

1. **Check browser console** - Often contains detailed error messages
2. **Check terminal output** - Metro bundler errors appear here
3. **Search the error** - Include "Expo" and "React Native" in your search
4. **Check Expo docs** - https://docs.expo.dev/
5. **Check NativeWind docs** - https://www.nativewind.dev/

---

**Document Version**: 1.0
**Last Updated**: 2026-01-19
