# Claude Project Context - Memory Mate 2026

## Project Overview

**Memory Mate 2026** is a mobile and web app to help people memorize Bible verses and other information.

The project uses a **phased approach**:
1. **Prototype** (current) - Python class defining data model and core functionality
2. **MVP** (next) - Full cross-platform app (iOS, Android, Web)
3. **Future** - Advanced features (multi-user, AI learning, sync)

**Key Principle**: MVP architecture is designed for rapid implementation and ease of iteration, intentionally not constrained by future capabilities which may change.

---

## Project Status

### Completed
- ✅ README structure and design principles documented
- ✅ MVP architecture designed (React Native + Expo, local-only storage)
- ✅ Data model specification (Verse, VerseProgress, TestResult)
- ✅ Python `MemoryMateStore` class with verse management implemented
- ✅ JSON-based persistence layer
- ✅ Unit tests for verse management (49 tests, 96% coverage)
- ✅ Demo script showcasing verse management capabilities
- ✅ Code review of verse management implementation
- ✅ VerseProgress dataclass and all methods implemented
- ✅ Unit tests for VerseProgress (37 tests, 97% overall coverage)
- ✅ Demo script updated with progress tracking features
- ✅ Design overview and implementation summary documented
- ✅ TestResult dataclass and all methods implemented
- ✅ Unit tests for TestResult (38 tests, 98% overall coverage)
- ✅ Demo script updated with test result tracking features

### Completed (Continued)
- ✅ Statistics methods (`get_stats`, `get_verse_stats`)
- ✅ Unit tests for statistics methods (30 tests, 98% overall coverage)
- ✅ MVP use cases documented (16 use cases across 4 categories)
- ✅ MVP implementation plan with review checkpoints
- ✅ **MVP Phase 1: Project Setup Complete**
  - Expo + TypeScript project initialized in `memory-mate-mvp/` subdirectory
  - Expo Router, NativeWind, Zustand, SQLite configured
  - Project structure created (`src/app/` for Expo Router pages)
  - Development environment documented
- ✅ **Checkpoint 1 (CP-1)**: Dev environment verified
- ✅ **MVP Phase 2: Navigation & Screen Shells Complete**
  - Tab navigation with 5 tabs (Home, Verses, Practice, Test, Settings)
  - All 12 screens created with placeholder content
  - Navigation flows implemented (tabs + stack)
  - All use cases have corresponding screens

### Completed (Continued)
- ✅ **Checkpoint 2 (CP-2)**: Navigation structure validated
  - Navigation flows tested and refined
  - See: [CP-2-REFINEMENTS.md](CP-2-REFINEMENTS.md)
  - See: [CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md](CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md)
  - See: [ccc.16.mvp-implementation-phase-2-completed-status.md](ccc.16.mvp-implementation-phase-2-completed-status.md)
- ✅ **MVP Phase 3: UI Components with Mock Data Complete**
  - Mock data file with 10 sample verses, progress, and test results
  - 8 core UI components built (VerseCard, VerseDetail, VerseForm, etc.)
  - All 12 screens populated with mock data and fully interactive
  - Consistent NativeWind styling applied throughout
  - TypeScript types defined for all entities
  - All 16 use cases demonstrable with interactive prototype
  - See: [ccc.17.mvp-implementation-phase-3-completed-status.md](ccc.17.mvp-implementation-phase-3-completed-status.md)
- ✅ **Checkpoint 3 (CP-3)**: Interactive prototype reviewed (minor issues deferred)
- ✅ **MVP Phase 4: Data Layer Integration Complete**
  - SQLite database with 3 tables (verses, progress, test_results)
  - 5 service modules mirroring Python prototype API
  - Zustand store with reactive state management
  - All screens connected to real database (no more mock data)
  - Loading and error states added throughout
  - ~909 lines of production code across 9 new files
  - See: [ccc.18.mvp-implementation-phase-4-detailed-plan.md](ccc.18.mvp-implementation-phase-4-detailed-plan.md)
  - See: [ccc.19.mvp-phase-4-completion-summary.md](ccc.19.mvp-phase-4-completion-summary.md)

### Next Steps
- ⏳ Checkpoint 4 (CP-4): Test data persistence and verify all CRUD operations
- Phase 5: Feature Integration & Polish
- Phase 6: Final Testing & Release Preparation

---

## Tech Stack

### Prototype (Current)
| Layer | Technology |
|-------|------------|
| Language | Python 3.12 |
| Storage | JSON file |
| Testing | pytest (155 tests, 98% coverage) |

### MVP (In Development)
| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| Frontend Framework | React Native + Expo | Expo 54.0, RN 0.81.5 | ✅ Installed |
| Language | TypeScript | 5.9 | ✅ Configured |
| Build/Dev | Expo | 54.0 | ✅ Working |
| Styling | NativeWind (Tailwind for RN) | NativeWind 4.2, Tailwind 3.3 | ✅ Configured |
| Navigation | Expo Router | 6.0 | ✅ Configured |
| State Management | Zustand | 5.0 | ✅ Installed |
| Storage | expo-sqlite | 16.0 | ✅ Installed |
| Backend (MVP) | None | - | Local-only |

---

## Data Model

### Core Entities

**Verse** - The memorizable text
- `id` (UUID)
- `reference` (e.g., "John 3:16")
- `text` - Full verse content
- `translation` (e.g., "NIV", "ESV")
- `created_at` (datetime)
- `archived` (bool)

**VerseProgress** - Memorization tracking ✅
- `verse_id` (FK)
- `times_practiced`, `times_tested`, `times_correct`
- `last_practiced`, `last_tested` (datetime)
- `comfort_level` (1-5 scale: 1=new, 5=memorized)

**TestResult** - Individual test attempts ✅
- `id` (UUID)
- `verse_id` (FK)
- `timestamp` (datetime)
- `passed` (bool)
- `score` (0.0-1.0, optional)

### Storage Format
Data persists as JSON in `memory_mate_data.json`:
```json
{
  "verses": {
    "uuid-1": {
      "id": "uuid-1",
      "reference": "John 3:16",
      "text": "For God so loved the world...",
      "translation": "NIV",
      "created_at": "2026-01-15T10:30:00",
      "archived": false
    }
  }
}
```

---

## MVP Capabilities

| Feature | Status |
|---------|--------|
| Manage verses (add, remove, archive, reset) | Planned |
| Review verses & see stats/progress | Planned |
| Practice verse(s) | Planned |
| Test on verse(s) | Planned |

---

## Project Structure

**IMPORTANT**: This project has TWO parallel codebases:
1. **Python Prototype** (root level) - Complete data model implementation for validation
2. **MVP App** (in `memory-mate-mvp/` subdirectory) - Expo/React Native mobile & web app

```
/home/alfred/lw/w509-MemoryMate2026/
│
├── README.md                                    # Main project doc (architecture, design principles)
├── claude.md                                    # This file - project context for Claude
├── ccc.00.active-context.md                     # Session-specific context and next steps (HUMAN-READABLE)
│
├── ccc.07.mvp-use-cases.md                      # MVP use cases (16 use cases)
├── ccc.08.mvp-implementation-plan.md            # MVP implementation plan with checkpoints
├── ccc.09.dev-environment-setup-for-mvp.md      # MVP dev environment setup guide
├── ccc.15.mvp-implementation-phase-2-detailed-plan.md  # Phase 2 detailed plan
├── ccc.16.mvp-implementation-phase-2-completed-status.md  # Phase 2 completion status
│
├── CP-1-CHECKPOINT-REVIEW.md                    # Checkpoint 1 review document
├── CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md    # Checkpoint 2 review document
├── CP-2-REFINEMENTS.md                          # CP-2 navigation refinements
│
├── memory_mate.py                               # Prototype: Python implementation
├── test_memory_mate.py                          # Prototype: Unit tests (155 tests, 98% coverage)
├── demo_memory_mate.py                          # Prototype: Demo script
│
└── memory-mate-mvp/                             # ← MVP APP IS HERE (subdirectory)
    ├── src/                                     # Source code directory
    │   ├── app/                                 # ← Expo Router pages (file-based routing)
    │   │   ├── _layout.tsx                      # Root Stack layout (with DB initialization)
    │   │   ├── (tabs)/                          # Tab navigation group
    │   │   │   ├── _layout.tsx                  # Tab bar layout (5 tabs)
    │   │   │   ├── index.tsx                    # Home/Dashboard tab
    │   │   │   ├── verses.tsx                   # Verses list tab
    │   │   │   ├── practice.tsx                 # Practice tab
    │   │   │   ├── test.tsx                     # Test tab
    │   │   │   └── settings.tsx                 # Settings tab
    │   │   ├── verse/                           # Verse stack screens
    │   │   │   ├── add.tsx                      # Add verse modal
    │   │   │   └── [id]/
    │   │   │       ├── index.tsx                # Verse detail
    │   │   │       └── edit.tsx                 # Edit verse modal
    │   │   ├── practice/
    │   │   │   └── [id].tsx                     # Practice individual verse
    │   │   └── test/
    │   │       └── [id].tsx                     # Test individual verse
    │   ├── components/                          # Reusable UI components (Phase 3+4)
    │   │   ├── index.ts                         # Component exports
    │   │   ├── LoadingSpinner.tsx               # Loading state component
    │   │   ├── ErrorDisplay.tsx                 # Error display component
    │   │   └── ... (8 other components)
    │   ├── services/                            # ✨ Data access layer (Phase 4)
    │   │   ├── index.ts                         # Service exports
    │   │   ├── database.ts                      # SQLite initialization
    │   │   ├── verseService.ts                  # Verse CRUD operations
    │   │   ├── progressService.ts               # Progress tracking
    │   │   ├── testService.ts                   # Test result management
    │   │   └── statsService.ts                  # Statistics calculations
    │   ├── store/                               # ✨ State management (Phase 4)
    │   │   ├── index.ts                         # Store exports
    │   │   └── verseStore.ts                    # Zustand store
    │   ├── types/                               # TypeScript definitions (Phase 3)
    │   │   └── index.ts                         # All type definitions
    │   └── utils/                               # Utilities
    │       └── mockData.ts                      # Mock data (deprecated - for reference only)
    ├── assets/                                  # Images, icons
    ├── package.json                             # Dependencies
    ├── tailwind.config.js                       # Tailwind CSS config
    ├── metro.config.js                          # Metro bundler config
    ├── tsconfig.json                            # TypeScript config
    └── README.md                                # MVP project README
```

### Quick Navigation Tips for AI Assistants

**When user mentions "the app"**, they mean: `memory-mate-mvp/`
**When looking for screens**, check: `memory-mate-mvp/src/app/`
**When looking for components** (Phase 3+), check: `memory-mate-mvp/src/components/`
**When looking for Python prototype**, check root level files: `memory_mate.py`, `test_memory_mate.py`

### Document Guide

| File | Purpose |
|------|---------|
| [README.md](README.md) | **START HERE** - Project overview, design principles, tech stack, architecture |
| [ccc.00.active-context.md](ccc.00.active-context.md) | **READ FOR NEXT SESSION** - Current context and next steps (human-readable) |
| [claude.md](claude.md) | **THIS FILE** - AI assistant context and project structure |
| | |
| **Prototype (Python)** | |
| [memory_mate.py](memory_mate.py) | Prototype implementation with Verse model and verse management |
| [test_memory_mate.py](test_memory_mate.py) | Unit tests for all implemented methods |
| [demo_memory_mate.py](demo_memory_mate.py) | Interactive demo showing all verse management features |
| [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md) | Data model specification and full class API design |
| [ccc.03.review-of-verse-management.md](ccc.03.review-of-verse-management.md) | Code review with issues and recommendations |
| | |
| **MVP Planning** | |
| [ccc.07.mvp-use-cases.md](ccc.07.mvp-use-cases.md) | **MVP use cases** - 16 detailed use cases across 4 categories |
| [ccc.08.mvp-implementation-plan.md](ccc.08.mvp-implementation-plan.md) | **MVP implementation plan** - 6 phases with review checkpoints |
| [ccc.09.dev-environment-setup-for-mvp.md](ccc.09.dev-environment-setup-for-mvp.md) | **MVP dev setup** - Environment setup and troubleshooting |
| | |
| **MVP Phase 1** | |
| [CP-1-CHECKPOINT-REVIEW.md](CP-1-CHECKPOINT-REVIEW.md) | **Checkpoint 1 review** - Dev environment verification checklist |
| | |
| **MVP Phase 2** | |
| [ccc.15.mvp-implementation-phase-2-detailed-plan.md](ccc.15.mvp-implementation-phase-2-detailed-plan.md) | **Phase 2 detailed plan** - Navigation & screen shells implementation |
| [ccc.16.mvp-implementation-phase-2-completed-status.md](ccc.16.mvp-implementation-phase-2-completed-status.md) | **Phase 2 status** - Completion report and CP-2 checklist |
| [CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md](CP-2-NAVIGATION-STRUCTURE-VERIFICATION.md) | **Checkpoint 2 review** - Navigation structure verification |
| [CP-2-REFINEMENTS.md](CP-2-REFINEMENTS.md) | **CP-2 refinements** - Navigation improvements from testing |
| | |
| **MVP Phase 3** | |
| [ccc.17.mvp-implementation-phase-3-completed-status.md](ccc.17.mvp-implementation-phase-3-completed-status.md) | **Phase 3 status** - UI components completion report |
| | |
| **MVP Phase 4** | |
| [ccc.18.mvp-implementation-phase-4-detailed-plan.md](ccc.18.mvp-implementation-phase-4-detailed-plan.md) | **Phase 4 detailed plan** - Data layer integration |
| [ccc.19.mvp-phase-4-completion-summary.md](ccc.19.mvp-phase-4-completion-summary.md) | **Phase 4 completion** - Data layer implementation summary |
| | |
| **MVP App** | |
| [memory-mate-mvp/README.md](memory-mate-mvp/README.md) | MVP project README with development commands |

---

## Implementation Roadmap

### Phase 1: Prototype (Current)
- [x] Define data model (Verse, VerseProgress, TestResult)
- [x] Implement Verse entity and verse management
- [x] Add unit tests for verse management (49 tests)
- [x] Create demo script for manual testing
- [x] Code review of verse management
- [x] Implement VerseProgress entity and methods
- [x] Add unit tests for VerseProgress (37 tests, 97% coverage)
- [x] Update demo script with progress tracking
- [x] Implement TestResult entity and methods
- [x] Add unit tests for TestResult (38 tests, 98% coverage)
- [x] Update demo script with test result tracking
- [x] Implement statistics methods (`get_stats`, `get_verse_stats`)
- [x] Add unit tests for statistics (30 tests, 98% coverage)
- [x] Update demo script with statistics tracking
- [ ] Validate data model with real-world verse data

### Phase 2: MVP Backend & Frontend
- [ ] Implement backend API (Node.js/Express or similar)
- [ ] Implement local SQLite storage (mirrors prototype)
- [ ] Create React Native + Expo frontend
- [ ] Implement tabs: Home, Add Verse, Practice, Test, Settings
- [ ] Add verse management UI
- [ ] Add progress tracking UI
- [ ] Add test/practice interface
- [ ] Add stats dashboard

### Phase 3: Future Features
- [ ] Backend/sync capability
- [ ] Multi-user and sharing
- [ ] AI-augmented learning
- [ ] Voice interface

---

## Key Design Decisions

### Why JSON Storage (Prototype)?
- Human-readable for debugging
- No external dependencies
- Easy to migrate to SQLite later
- Sufficient for single-user prototype

### Why React Native + Expo (MVP)?
- Single codebase for iOS, Android, Web
- Rapid development with Expo Go
- No native toolchain setup needed
- Large ecosystem and documentation

### Why Local-Only Storage (MVP)?
- Eliminates backend complexity
- Faster iteration
- Users own their data (privacy)
- Backend/sync can be added later

### Why Separate Progress from Verse?
- Clean separation of concerns
- Progress can be reset without affecting verse
- Easier to extend with new tracking fields

### Why Store Individual Test Results?
- Enables trend analysis
- Supports future spaced repetition algorithms
- Can aggregate for statistics

---

## MVP File Structure (Planned)

```
src/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home
│   │   ├── practice.tsx   # Practice verses
│   │   ├── add.tsx        # Add verse
│   │   └── stats.tsx      # Progress stats
│   ├── verse/[id].tsx     # Verse detail/practice
│   └── _layout.tsx        # Root layout
├── components/             # Reusable UI
├── store/                  # Zustand state
├── services/               # Data layer (mirrors Python prototype)
├── types/                  # TypeScript definitions
└── utils/                  # Helpers
```

---

## Python Prototype API (Implemented)

### Verse Management
```python
store = MemoryMateStore()

# Add verse
verse = store.add_verse("John 3:16", "For God so loved the world...", "NIV")

# Retrieve
verse = store.get_verse(verse.id)
all_verses = store.get_all_verses(include_archived=False)

# Update
updated = store.update_verse(verse.id, translation="ESV")

# Archive
store.archive_verse(verse.id)
store.unarchive_verse(verse.id)

# Remove
store.remove_verse(verse.id)
```

### Persistence
- Automatic: saves after any mutation
- File: `memory_mate_data.json`
- Format: JSON with pretty-printing

---

## Notes for Future Development

### Before Starting MVP Backend
- Finalize TypeScript types based on Verse model
- Plan API endpoints mirroring Python methods
- Decide on SQLite schema
- Consider migration strategy from prototype JSON

### Before Starting MVP Frontend
- Create UI mockups for each screen
- Plan state management flow (Zustand stores)
- Consider gesture handling (swipes for practice/test)
- Plan offline sync strategy (defer to future)

### Testing Strategy
- Unit tests for prototype methods (Python)
- Integration tests for backend API
- E2E tests for critical user flows
- Manual testing with real Bible verse data

---

## Quick Reference Commands

```bash
# Run tests (use python3 on this system)
python3 -m pytest test_memory_mate.py -v              # Run all tests
python3 -m pytest test_memory_mate.py --cov=memory_mate  # With coverage

# Run demo
python3 demo_memory_mate.py

# Interactive Python
python3 -c "from memory_mate import *; store = MemoryMateStore(); ..."

# Future MVP
npx create-expo-app memory-mate
cd memory-mate
npx expo start                              # Start dev server
```

---

## Contact / Questions

Refer to [README.md](README.md) for project overview and design principles.
See [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md) for detailed data model and class API.

---

## Important Notes for AI Assistants

### Directory Confusion Prevention
- **The MVP app is NOT at the root level** - it's in `memory-mate-mvp/` subdirectory
- **Screen files are in** `memory-mate-mvp/src/app/` NOT `app/` at root
- **Expo Router uses file-based routing** - file structure determines routes
- **Two parallel codebases exist**: Python prototype (root) and MVP app (subdirectory)

### Current Working Directory
When helping with the MVP app, remember to:
- Use paths relative to `/home/alfred/lw/w509-MemoryMate2026/memory-mate-mvp/`
- Run commands from the `memory-mate-mvp/` directory
- Read files from `memory-mate-mvp/src/app/` for screens

### Phase 2 Screen Organization
- **Tab screens**: `src/app/(tabs)/*.tsx` - These keep the tab bar visible
- **Stack screens**: `src/app/verse/`, `src/app/practice/`, `src/app/test/` - These stack on top
- **Dynamic routes**: `[id]` in filename means route parameter (e.g., `/verse/123`)

---

**Last Updated**: 2026-01-25
**Project Status**: Phase 4 Implementation Complete - Ready for CP-4 Testing
