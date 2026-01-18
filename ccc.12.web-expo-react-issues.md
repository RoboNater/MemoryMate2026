# Web/Expo/React Configuration Issues - Resolution Log

**Date**: 2026-01-18
**Status**: Resolved

---

## Summary

During CP-1 checkpoint testing, multiple issues were encountered when attempting to run the Expo app on web. This document records the issues encountered and their resolutions.

---

## Issue 1: NativeWind Preset Missing

**Error**:
```
Tailwind CSS has not been configured with the NativeWind preset
```

**Cause**: The `tailwind.config.js` file was missing the NativeWind preset.

**Resolution**: Added the preset to `tailwind.config.js`:
```js
module.exports = {
  content: [...],
  presets: [require("nativewind/preset")],  // <-- Added this line
  theme: { extend: {} },
  plugins: [],
}
```

---

## Issue 2: Web Dependencies Not Installed

**Error**: Web bundling failed - missing `react-native-web` and `react-dom`.

**Cause**: Web platform dependencies were not installed during initial setup.

**Resolution**: Install with `--legacy-peer-deps` due to React 19 peer dependency conflicts:
```bash
npm install react-dom@19.1.0 react-native-web --legacy-peer-deps
```

**Important**: Must install `react-dom@19.1.0` (not latest) to match `react@19.1.0`. See Issue 5.

---

## Issue 3: Missing babel-preset-expo

**Error**:
```
Cannot find module 'babel-preset-expo'
```

**Cause**: NativeWind requires Babel configuration with `babel-preset-expo`, which wasn't installed.

**Resolution**:
```bash
npm install --save-dev babel-preset-expo --legacy-peer-deps
```

And create `babel.config.js`:
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

---

## Issue 4: Missing react-native-reanimated and react-native-worklets

**Error**:
```
Cannot find module 'react-native-worklets/plugin'
```

**Cause**: `react-native-reanimated` is a peer dependency of NativeWind, and `react-native-worklets` is a peer dependency of `react-native-reanimated`. Neither was installed.

**Resolution**:
```bash
npm install react-native-reanimated react-native-worklets --legacy-peer-deps
```

**Note**: When using `--legacy-peer-deps`, npm does not warn about missing peer dependencies. This means you must manually identify and install them.

---

## Issue 5: React/React-DOM Version Mismatch

**Error** (in browser console):
```
Uncaught Error: Incompatible React versions: The "react" and "react-dom" packages must have the exact same version. Instead got:
  - react:      19.1.0
  - react-dom:  19.2.3
```

**Cause**: Installing `react-dom` without specifying a version pulled the latest (19.2.3), which didn't match the Expo-pinned `react@19.1.0`.

**Resolution**: Pin react-dom to match react:
```bash
npm install react-dom@19.1.0 --legacy-peer-deps
```

---

## Issue 6: Missing Metro Bundler Configuration for Web

**Symptom**: Blank page on web even after styles were working.

**Cause**: `app.json` was missing the web bundler configuration.

**Resolution**: Add to `app.json`:
```json
{
  "expo": {
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"  // <-- Added this line
    }
  }
}
```

---

## Issue 7: Wrong Entry Point for Expo Router

**Symptom**: Web showed "Open up App.tsx to start working on your app!" instead of the app content.

**Cause**: `package.json` had `"main": "index.ts"` instead of the Expo Router entry point.

**Resolution**: Update `package.json`:
```json
{
  "main": "expo-router/entry"
}
```

---

## Issue 8: Duplicate App Directories

**Symptom**: Web showed boilerplate "Hello World" content from `src/app/` instead of custom content in `app/`.

**Cause**: Project had both `app/` and `src/app/` directories. Expo Router prioritizes `src/app/`.

**Resolution**: Consolidated all route files into `src/app/` and removed the duplicate `app/` directory at root.

---

## Correct Installation Order

Based on these issues, the correct order for setting up Expo with NativeWind for web is:

1. Create Expo project
2. Install Expo Router dependencies
3. Install NativeWind with ALL peer dependencies:
   ```bash
   npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps
   npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps
   ```
4. Install web dependencies with version pinning:
   ```bash
   npm install react-dom@19.1.0 react-native-web --legacy-peer-deps
   ```
5. Create/update configuration files:
   - `tailwind.config.js` (with NativeWind preset)
   - `babel.config.js` (with NativeWind and reanimated plugins)
   - `metro.config.js` (with NativeWind)
   - `global.css` (Tailwind directives)
6. Update `app.json`:
   - Add `"bundler": "metro"` under `web`
7. Update `package.json`:
   - Set `"main": "expo-router/entry"`
8. Ensure routes are in `src/app/` (not `app/` at root)

---

## Lessons Learned

1. **`--legacy-peer-deps` silences ALL peer dependency warnings** - You must manually check and install peer dependencies.

2. **Version pinning is critical** - Always pin `react-dom` to match `react` exactly.

3. **Check entry points** - Expo Router requires `"main": "expo-router/entry"` in package.json.

4. **Web requires extra configuration** - The `"bundler": "metro"` setting in `app.json` is required for web.

5. **Directory structure matters** - Expo Router looks for `src/app/` before `app/`.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-18
