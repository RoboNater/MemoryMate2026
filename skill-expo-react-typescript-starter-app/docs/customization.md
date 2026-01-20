# Customization Guide

This guide explains how to customize the Expo starter app setup for your specific needs.

## Table of Contents

1. [Modifying Dependencies](#modifying-dependencies)
2. [Customizing Project Structure](#customizing-project-structure)
3. [Extending Tailwind Configuration](#extending-tailwind-configuration)
4. [Adding Navigation Patterns](#adding-navigation-patterns)
5. [Platform-Specific Configuration](#platform-specific-configuration)
6. [Removing Optional Features](#removing-optional-features)

---

## Modifying Dependencies

### Adding New Packages

Always use `--legacy-peer-deps` when adding packages:

```bash
npm install new-package --legacy-peer-deps
```

### Updating Expo SDK

To update to a newer Expo SDK:

```bash
npx expo upgrade
```

This will update all Expo-related packages to compatible versions.

### Pinning Versions

For production stability, pin specific versions in package.json:

```json
{
  "dependencies": {
    "nativewind": "4.2.1",
    "zustand": "5.0.10"
  }
}
```

---

## Customizing Project Structure

### Default Structure

```
src/
├── app/              # Expo Router pages
├── components/       # Reusable UI components
├── store/            # Zustand stores
├── services/         # API/database layer
├── types/            # TypeScript definitions
├── utils/            # Helper functions
└── constants/        # App constants
```

### Feature-Based Structure

For larger apps, consider feature-based organization:

```
src/
├── app/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store.ts
│   │   └── types.ts
│   ├── memory/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store.ts
│   │   └── types.ts
│   └── settings/
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
└── types/
```

### Updating Path Aliases

Update `tsconfig.json` to match your structure:

```json
{
  "compilerOptions": {
    "paths": {
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/app/*": ["./src/app/*"]
    }
  }
}
```

---

## Extending Tailwind Configuration

### Adding Custom Colors

Edit `tailwind.config.js`:

```javascript
module.exports = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
    },
  },
}
```

### Adding Custom Fonts

1. Add font files to `assets/fonts/`

2. Configure in app.json:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/Inter-Regular.ttf"]
        }
      ]
    ]
  }
}
```

3. Extend Tailwind:
```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ['Inter'],
    },
  },
}
```

### Adding Custom Spacing

```javascript
theme: {
  extend: {
    spacing: {
      '18': '4.5rem',
      '88': '22rem',
    },
  },
}
```

---

## Adding Navigation Patterns

### Tab Navigation

Create a tab layout at `src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

Install icons:
```bash
npx expo install @expo/vector-icons
```

### Drawer Navigation

Install drawer:
```bash
npm install @react-navigation/drawer react-native-gesture-handler --legacy-peer-deps
```

Create drawer layout at `src/app/_layout.tsx`:

```tsx
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer>
      <Drawer.Screen name="index" options={{ title: 'Home' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
    </Drawer>
  );
}
```

### Modal Routes

Create a modal route at `src/app/modal.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function Modal() {
  return (
    <>
      <Stack.Screen options={{ presentation: 'modal' }} />
      <View className="flex-1 items-center justify-center">
        <Text>Modal Content</Text>
      </View>
    </>
  );
}
```

---

## Platform-Specific Configuration

### Conditional Rendering

```tsx
import { Platform, View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View>
      {Platform.OS === 'ios' && <Text>iOS specific content</Text>}
      {Platform.OS === 'android' && <Text>Android specific content</Text>}
      {Platform.OS === 'web' && <Text>Web specific content</Text>}
    </View>
  );
}
```

### Platform-Specific Files

Create platform-specific versions:
- `MyComponent.tsx` - default
- `MyComponent.ios.tsx` - iOS only
- `MyComponent.android.tsx` - Android only
- `MyComponent.web.tsx` - Web only

React Native automatically picks the correct file.

### app.json Platform Settings

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mycompany.myapp"
    },
    "android": {
      "package": "com.mycompany.myapp",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    }
  }
}
```

---

## Removing Optional Features

### Remove SQLite (if not using local database)

1. Uninstall package:
```bash
npm uninstall expo-sqlite
```

2. Remove from app.json plugins:
```json
{
  "expo": {
    "plugins": [
      "expo-router"
      // Remove "expo-sqlite"
    ]
  }
}
```

### Remove Zustand (if not using state management)

```bash
npm uninstall zustand
```

Delete the `src/store/` directory.

### Remove Web Support (mobile only)

1. Uninstall web packages:
```bash
npm uninstall react-dom react-native-web
```

2. Remove web config from app.json:
```json
{
  "expo": {
    // Remove "web" section entirely
  }
}
```

### Minimal NativeWind Setup

For simpler styling needs, you can use basic NativeWind without all features:

1. Keep only essential config in babel.config.js:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

2. Use inline styles instead:
```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

---

## Environment Variables

### Setup

Install expo-constants (already included):

Create `app.config.js`:

```javascript
export default {
  expo: {
    // ... existing config from app.json
    extra: {
      apiUrl: process.env.API_URL || 'https://api.example.com',
      environment: process.env.NODE_ENV || 'development',
    },
  },
};
```

### Usage

```tsx
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

### .env Files

Install dotenv for local development:

```bash
npm install dotenv --save-dev --legacy-peer-deps
```

Create `.env`:
```
API_URL=https://api.example.com
```

Update `app.config.js`:
```javascript
import 'dotenv/config';

export default {
  // ...
};
```

---

## Testing Setup

### Jest Configuration

Install testing dependencies:

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native --legacy-peer-deps
```

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

Add to package.json:
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-19
