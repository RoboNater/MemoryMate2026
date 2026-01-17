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

### Not Started
- ⏳ MVP frontend (React Native + Expo app)

---

## Tech Stack

### Prototype (Current)
| Layer | Technology |
|-------|------------|
| Language | Python 3.12 |
| Storage | JSON file |
| Testing | pytest (155 tests, 98% coverage) |

### MVP (Planned)
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend Framework | React Native + Expo | Single codebase for iOS, Android, Web |
| Language | TypeScript | Type safety, excellent tooling |
| Build/Dev | Expo | Simplified pipeline, OTA updates, Expo Go |
| Styling | NativeWind (Tailwind for RN) | Familiar utility-first CSS, cross-platform |
| Navigation | Expo Router | File-based routing, all platforms |
| State Management | Zustand | Lightweight, minimal boilerplate |
| Storage | expo-sqlite | Structured data, offline-first |
| Backend (MVP) | None | Local-only to reduce complexity |

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

```
/home/alfred/lw/w509-MemoryMate2026/
├── README.md                                    # Main project doc (architecture, design principles)
├── claude.md                                    # This file - project context for Claude
├── memory_mate.py                               # Prototype implementation (Verse class, verse methods)
├── test_memory_mate.py                          # Unit tests (49 tests, 96% coverage)
├── demo_memory_mate.py                          # Demo script showcasing capabilities
├── ccc.00.active-context.md                     # Session-specific context and next steps
├── ccc.01.initial-review.md                     # Review of initial README
├── ccc.02.design-prototype-data-and-class.md    # Data model & class design spec
├── ccc.03.review-of-verse-management.md         # Review of verse management implementation
├── example.01.tmdb-movie-app-architecture.md    # Reference architecture (TMDB app example)
└── .git/                                        # Git repository
```

### Document Guide

| File | Purpose |
|------|---------|
| [README.md](README.md) | **START HERE** - Project overview, design principles, tech stack, architecture |
| [memory_mate.py](memory_mate.py) | Prototype implementation with Verse model and verse management |
| [test_memory_mate.py](test_memory_mate.py) | Unit tests for all implemented methods |
| [demo_memory_mate.py](demo_memory_mate.py) | Interactive demo showing all verse management features |
| [ccc.00.active-context.md](ccc.00.active-context.md) | **READ FOR NEXT SESSION** - Current context and next steps |
| [ccc.02.design-prototype-data-and-class.md](ccc.02.design-prototype-data-and-class.md) | Data model specification and full class API design |
| [ccc.03.review-of-verse-management.md](ccc.03.review-of-verse-management.md) | Code review with issues and recommendations |
| [ccc.01.initial-review.md](ccc.01.initial-review.md) | Early review with formatting fixes and architectural concerns |
| [example.01.tmdb-movie-app-architecture.md](example.01.tmdb-movie-app-architecture.md) | Reference: architecture patterns from TMDB app |

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

**Last Updated**: 2026-01-17
**Project Status**: Prototype Phase - Statistics Complete (155 tests, 98% coverage)
