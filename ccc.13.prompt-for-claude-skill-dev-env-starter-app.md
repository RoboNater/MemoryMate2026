# Prompt: Create Claude Skill for Expo Development Environment & Starter App

**Date**: 2026-01-19
**Purpose**: Prompt for an LLM-powered agent to create a portable Claude Code skill for setting up Expo/React Native development environments and starter apps.

---

## Task Overview

Create a **Claude Code skill** that automates the setup of an Expo + React Native + TypeScript development environment with a working "Hello World" starter app. This skill should encapsulate the lessons learned from the Memory Mate MVP Phase 1 implementation, handling common pitfalls and configuration issues automatically.

---

## Background Context

We completed Phase 1 of the Memory Mate MVP project, which involved setting up an Expo development environment and getting a starter app running on web (and potentially iOS/Android). The process required working through several issues:

1. **React 19 peer dependency conflicts** - Required `--legacy-peer-deps` flag
2. **NativeWind configuration complexities** - Multiple config files needed
3. **Web platform-specific issues** - Version pinning, bundler config, entry points
4. **Directory structure matters** - `src/app/` vs `app/` with Expo Router

The skill should automate this setup so future projects don't require manual troubleshooting.

---

## Reference Documents

Read these documents from the Memory Mate project to understand the full context and lessons learned:

### Primary References

| Document | Purpose | Key Information |
|----------|---------|-----------------|
| `ccc.08.mvp-implementation-plan.md` | MVP implementation plan | Phase 1 goals, deliverables, and checkpoint criteria |
| `ccc.09.dev-environment-setup-for-mvp.md` | Dev environment setup guide | Step-by-step instructions, configuration files, dependency installation |
| `ccc.11.react-19-dependency-conflicts.md` | React 19 dependency issues | Why `--legacy-peer-deps` is needed, workarounds, future resolution |
| `ccc.12.web-expo-react-issues.md` | Web platform issues | 8 specific issues encountered and their resolutions |

### Supporting References

| Document | Purpose |
|----------|---------|
| `claude.md` | Project context file showing overall project structure and tech stack |
| `CP-1-CHECKPOINT-REVIEW.md` | Checkpoint 1 verification checklist with testing instructions |
| `memory-mate-mvp/` directory | Working example of the completed Phase 1 setup |

---

## Skill Requirements

### 1. Skill Metadata

Create a skill with the following characteristics:

```yaml
name: expo-starter
description: >
  Set up an Expo + React Native + TypeScript development environment with
  NativeWind styling, Expo Router navigation, Zustand state management, and
  SQLite storage. Creates a working starter app for iOS, Android, and Web.
  Use when starting a new cross-platform mobile/web app project.
```

### 2. Core Capabilities

The skill should be able to:

1. **Initialize Project**
   - Create new Expo project with TypeScript template
   - Configure for iOS, Android, and Web targets

2. **Install Dependencies** (handling React 19 conflicts)
   - Expo Router + navigation dependencies
   - NativeWind + Tailwind CSS (with all peer dependencies)
   - Web platform support (react-dom pinned to match react version)
   - Zustand state management
   - expo-sqlite for local storage

3. **Configure Project**
   - Set up `package.json` entry point for Expo Router
   - Configure `app.json` with scheme, plugins, and web bundler
   - Create `tailwind.config.js` with NativeWind preset
   - Create `babel.config.js` with NativeWind and Reanimated plugins
   - Create `metro.config.js` with NativeWind integration
   - Create `global.css` with Tailwind directives
   - Configure `tsconfig.json` with path aliases
   - Add `nativewind-env.d.ts` for TypeScript support

4. **Create Project Structure**
   ```
   src/
   ├── app/              # Expo Router pages (or app/ at root)
   │   ├── _layout.tsx   # Root layout importing global.css
   │   └── index.tsx     # Home screen
   ├── components/       # Reusable UI components
   ├── store/            # Zustand stores
   ├── services/         # Data access layer
   ├── types/            # TypeScript definitions
   ├── utils/            # Helper functions
   └── constants/        # App constants
   ```

5. **Create Starter App**
   - Root layout with navigation setup
   - Index page with styled "Hello World" content
   - Verify NativeWind styling works

6. **Validate Setup**
   - Provide verification checklist
   - Include troubleshooting guidance for common issues

### 3. Key Technical Details

The skill must incorporate these lessons learned:

#### Dependency Installation Order
```bash
# 1. Create Expo project
npx create-expo-app@latest PROJECT_NAME --template expo-template-blank-typescript

# 2. Install Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# 3. Install NativeWind with ALL peer dependencies
npm install nativewind react-native-reanimated react-native-worklets --legacy-peer-deps
npm install --save-dev tailwindcss@^3.4.17 babel-preset-expo --legacy-peer-deps

# 4. Install web dependencies with VERSION PINNING
# CRITICAL: Pin react-dom to match react version exactly
npm install react-dom@$(npm list react --json | jq -r '.dependencies.react.version') react-native-web --legacy-peer-deps

# 5. Install state management and storage
npm install zustand --legacy-peer-deps
npx expo install expo-sqlite
```

#### Critical Configuration Points

1. **package.json**: `"main": "expo-router/entry"`
2. **app.json**: `"web": { "bundler": "metro" }`
3. **tailwind.config.js**: Must include `presets: [require("nativewind/preset")]`
4. **babel.config.js**: Must include NativeWind and reanimated plugins
5. **react-dom version**: MUST match react version exactly

#### Common Pitfalls to Avoid

1. `--legacy-peer-deps` silences ALL peer dependency warnings - skill must ensure all peer deps are installed
2. Installing `react-dom` without version pinning will cause version mismatch errors
3. Having both `app/` and `src/app/` causes Expo Router confusion
4. Missing `metro.config.js` or wrong NativeWind preset causes styling failures
5. Missing web bundler config causes blank page on web

### 4. User Interaction

The skill should:

1. **Ask for project configuration**:
   - Project name
   - Whether to include all default dependencies or minimal setup
   - Target platforms (iOS, Android, Web, or all)

2. **Provide progress updates** as it works through the setup

3. **Output verification instructions** at the end

### 5. Portability

The skill should be:

- **Self-contained**: All instructions and scripts in the skill directory
- **Configurable**: Allow customization of dependencies and structure
- **Documented**: Include troubleshooting for common issues
- **Reusable**: Can be placed in `~/.claude/skills/` for personal use or `.claude/skills/` for project use

---

## Skill File Structure

Create the skill with this structure:

```
expo-starter/
├── SKILL.md                      # Main skill file with metadata and instructions
├── templates/
│   ├── app-layout.tsx            # Template for _layout.tsx
│   ├── app-index.tsx             # Template for index.tsx
│   ├── tailwind.config.js        # Template config
│   ├── babel.config.js           # Template config
│   ├── metro.config.js           # Template config
│   └── global.css                # Template CSS
├── scripts/
│   └── validate-setup.sh         # Validation script (optional)
└── docs/
    ├── troubleshooting.md        # Common issues and solutions
    └── customization.md          # How to customize the setup
```

---

## SKILL.md Template

```yaml
---
name: expo-starter
description: >
  Set up an Expo + React Native + TypeScript development environment with
  NativeWind styling, Expo Router navigation, Zustand state management, and
  SQLite storage. Creates a working starter app for iOS, Android, and Web.
  Use when starting a new cross-platform mobile/web app project, creating
  an Expo project, or setting up React Native development.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
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

[... detailed instructions follow ...]
```

---

## Success Criteria

The skill is complete when:

1. Running the skill creates a fully working Expo project
2. The project runs successfully on web (`npx expo start --web`)
3. NativeWind styling is visible and working
4. Expo Router navigation is configured
5. All dependencies install without errors (using appropriate flags)
6. Project structure follows best practices
7. Troubleshooting documentation covers known issues

---

## Additional Notes

### React 19 Context

As of 2026-01-18, Expo SDK 54 pins React to 19.1.0. Many packages haven't updated their peer dependencies for React 19.x, requiring `--legacy-peer-deps`. The skill should:

1. Use `--legacy-peer-deps` where needed
2. Document this as a known limitation
3. Include guidance for when this can be removed (future Expo SDK updates)

### Web Platform Considerations

The web platform requires extra configuration that iOS/Android don't need:
- `react-dom` and `react-native-web` packages
- `"bundler": "metro"` in app.json
- Proper entry point configuration

### Future Enhancements

The skill could be extended to support:
- Tab navigation template
- Authentication boilerplate
- API integration patterns
- Additional styling frameworks

---

## Files to Reference

When building this skill, read these files from the Memory Mate project:

```
/home/alfred/lw/w509-MemoryMate2026/
├── ccc.08.mvp-implementation-plan.md      # Phase 1 goals and criteria
├── ccc.09.dev-environment-setup-for-mvp.md # Complete setup instructions
├── ccc.11.react-19-dependency-conflicts.md # React 19 issues
├── ccc.12.web-expo-react-issues.md        # Web-specific issues (8 resolved)
├── CP-1-CHECKPOINT-REVIEW.md              # Verification checklist
├── claude.md                               # Project context
└── memory-mate-mvp/                        # Working example
    ├── package.json
    ├── app.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── babel.config.js
    ├── metro.config.js
    ├── global.css
    ├── nativewind-env.d.ts
    └── src/app/
        ├── _layout.tsx
        └── index.tsx
```

---

**Document Version**: 1.0
**Created**: 2026-01-19
