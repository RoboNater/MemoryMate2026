# Memory Mate 2026

This is the 2026 prototype for Memory Mate, a mobile and web-app to help people memorize Bible verses and other information.

# Capabilities

## Capabilities of this Prototype
- A python class to prototype the capabilities that will be included in the MVP
- - This will focus on the "backend" architecture including simple data model and storage
- - Will also provide methods to add, remove, retrieve verses, and get/set test results / stats
- Practice Verse(s) and Test on Verse(s) will not be implemented in this first prototype
- - These are user-interface centric
- - The python class capabilties related to practice/test are the 'retrieve verses' and 'get/set test results/stats' methods

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
- - Pictures, sounds/music/songs
- - Coach through memorization techniques and aids
- - Voice interface


# Architecture
Architecture is not fleshed out yet. One possible architecture is that of a mobile web app that I am familiar with called TMDB, a simple movie/tv exploration app.  The architecture of that app is provided here as an example.  Note that the "Frontend-only SPA" is not applicable as a backend storage and future sync capability is desired.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript |
| **Framework** | React 18 |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **State** | React Context + Redux Toolkit Query |
| **Routing** | React Router v6 |
| **Animations** | Framer Motion |
| **Deployment** | Vercel |

## Architecture

**Frontend-only SPA** - No backend server or database. All movie data comes from the **TMDB (The Movie Database) API**.

```
src/
├── pages/          # Route components (Home, Catalog, Detail, NotFound)
├── common/         # Reusable UI (Header, Footer, MovieCard, VideoModal)
├── services/       # TMDB API integration via RTK Query
├── context/        # Global state (theme, sidebar, video modal)
├── hooks/          # Custom hooks (animations, click outside, keyboard)
├── constants/      # Navigation links, theme options, categories
└── utils/          # Config, helpers
```

