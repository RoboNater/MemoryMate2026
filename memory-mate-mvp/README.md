# Memory Mate MVP

Mobile and web app to help memorize Bible verses.

## Phase 1: Project Setup ✅

This project has completed Phase 1 of the MVP implementation plan.

### What's Working

- ✅ Expo + TypeScript project initialized
- ✅ Expo Router configured for navigation
- ✅ NativeWind (Tailwind CSS) configured for styling
- ✅ Zustand ready for state management
- ✅ expo-sqlite ready for local storage
- ✅ TypeScript with path aliases
- ✅ Project structure created

## Development

### Prerequisites

- Node.js v24+ (tested with v24.11.1)
- npm 11+ (tested with 11.6.4)

### Getting Started

```bash
# Install dependencies (already done if you cloned)
npm install

# Start development server
npx expo start

# Run on specific platform
npx expo start --web      # Web browser
npx expo start --ios      # iOS simulator (macOS only)
npx expo start --android  # Android emulator
```

### Project Structure

```
memory-mate-mvp/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Home screen
├── src/
│   ├── components/        # Reusable UI components
│   ├── store/             # Zustand state stores
│   ├── services/          # Data access layer
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Helper functions
│   └── constants/         # App constants
├── assets/                # Images, fonts
├── global.css             # Tailwind directives
├── tailwind.config.js     # Tailwind configuration
└── metro.config.js        # Metro bundler config
```

## Tech Stack

- **Framework**: Expo ~54.0 + React Native
- **Language**: TypeScript 5.9
- **Navigation**: Expo Router 6.0
- **Styling**: NativeWind 4.2 (Tailwind CSS for RN)
- **State**: Zustand 5.0
- **Storage**: expo-sqlite 16.0

## Documentation

- [MVP Use Cases](../ccc.07.mvp-use-cases.md)
- [Implementation Plan](../ccc.08.mvp-implementation-plan.md)
- [Dev Environment Setup](../ccc.09.dev-environment-setup-for-mvp.md)

## Next Steps

- [ ] **Checkpoint 1 Review** - Verify dev environment works
- [ ] Phase 2: Navigation & Screen Shells
- [ ] Checkpoint 2: UI/UX Review vs Use Cases
- [ ] Phase 3: UI Components with Mock Data
- [ ] Checkpoint 3: Interactive Prototype Review

See [Implementation Plan](../ccc.08.mvp-implementation-plan.md) for details.
