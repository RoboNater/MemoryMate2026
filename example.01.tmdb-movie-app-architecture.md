# TMDB Movie App Architecture - Reference Example

This document describes the architecture of TMDB (The Movie Database), a simple movie/TV exploration app. This is provided as a reference example for architectural patterns and structure.

## Overview

**Frontend-only SPA** - No backend server or database. All movie data comes from the **TMDB (The Movie Database) API**.

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

## Directory Structure

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

## Key Patterns

- **API Integration**: RTK Query for efficient data fetching and caching
- **State Management**: React Context for UI state (theme, sidebar), RTK Query for server state
- **Component Organization**: Separation between pages (route components) and reusable common components
- **Custom Hooks**: Encapsulation of logic for animations, event handlers, and DOM interactions
