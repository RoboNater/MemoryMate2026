# Memory Mate 2026

This is the 2026 prototype for Memory Mate, a mobile and web-app to help people memorize Bible verses and other information.

# Capabilities

## Capabilities of this Prototype
- A python class to prototype the capabilities that will be included in the MVP
  - This will focus on the "backend" architecture including simple data model and storage
  - Will also provide methods to add, remove, retrieve verses, and get/set test results / stats
- Practice Verse(s) and Test on Verse(s) will not be implemented in this first prototype
  - These are user-interface centric
  - The python class capabilties related to practice/test are the 'retrieve verses' and 'get/set test results/stats' methods

## Capabilities of the Memory Mate MVP (Minimum Viable Product)
- Manage verses: Add, remove, archive, reset progress
- Review Verses and see stats/progress
- Practice Verse(s)
- Test on Verse(s)

## Future Capabilities
- Organize - Shelf/Book system
- Backup/Sync
- Multi user, sharing, social
- AI augmented learning / test
  - Pictures, sounds/music/songs
  - Coach through memorization techniques and aids
  - Voice interface


# Architecture

## Design Principles

The MVP architecture prioritizes:

1. **Rapid Implementation** - Choose proven, well-documented technologies that enable fast development
2. **Ease of Iteration** - Favor simplicity over sophistication to allow quick pivots and changes
3. **Cross-Platform Deployment** - Support both mobile and web from a single codebase
4. **Minimal Complexity** - Avoid over-engineering for future capabilities that may change

The future capabilities (multi-user, AI features, etc.) are intentionally given minimal weight in MVP architecture decisions, as those requirements are subject to change. The MVP should ship quickly and validate core functionality first.

## Prototype → MVP Relationship

The Python prototype class serves as:
- A **functionality specification** defining the core operations and data model
- A **reference implementation** that the MVP backend will mirror
- A **test harness** for validating business logic before frontend integration

This approach separates concern: Python for rapid prototyping and specification, TypeScript/React for the production app.

## MVP Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | React Native + Expo | Single codebase for iOS, Android, and Web |
| **Language** | TypeScript | Type safety, excellent tooling |
| **Build/Dev Tool** | Expo | Simplified build pipeline, OTA updates |
| **Styling** | NativeWind (Tailwind for RN) | Familiar utility-first CSS, cross-platform |
| **Navigation** | Expo Router | File-based routing, works on all platforms |
| **State Management** | Zustand | Lightweight, simple API, no boilerplate |
| **Local Storage** | expo-sqlite | Structured data, offline-first capability |
| **Backend (MVP)** | None (local-only) | Simplify MVP, add backend when needed |

### Why React Native + Expo?

- **Single codebase** deploys to iOS, Android, and Web
- **Expo Go** enables rapid development and testing on physical devices
- **EAS Build** handles app store deployment without native toolchain setup
- **Large ecosystem** with extensive documentation and community support

### Why Local-Only Storage for MVP?

- Eliminates backend complexity and hosting costs
- Faster iteration without API development
- Users own their data (privacy-friendly)
- Backend/sync can be added later without major refactoring

## Project Structure

```
src/
├── app/                # Expo Router pages
│   ├── (tabs)/         # Tab navigation screens
│   ├── verse/[id].tsx  # Verse detail/practice screen
│   └── _layout.tsx     # Root layout
├── components/         # Reusable UI components
├── store/              # Zustand state management
├── services/           # Data access layer (mirrors Python prototype)
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Reference Architecture

For additional architectural patterns and structure examples, see [example.01.tmdb-movie-app-architecture.md](example.01.tmdb-movie-app-architecture.md).

