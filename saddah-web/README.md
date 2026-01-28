# SADDAH Web

React frontend for SADDAH CRM - AI-Powered CRM for Saudi Real Estate Market.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with RTL support
- **State:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **i18n:** react-i18next (Arabic/English)
- **Icons:** Lucide React

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:5173
   ```

## Project Structure

```
src/
├── components/
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── pages/
│   ├── auth/           # Authentication pages
│   └── ...             # Feature pages
├── stores/             # Zustand stores
├── services/           # API services
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── i18n/               # Translations
└── styles/             # Global styles
```

## Features

### RTL Support
- Arabic-first design
- Tailwind RTL plugin
- Automatic direction switching

### Design System
- Custom color palette (Primary: Teal, Secondary: Amber)
- Arabic typography (IBM Plex Sans Arabic)
- Responsive components

### Authentication
- JWT token management
- Auto token refresh
- Protected routes

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |

## Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests and lint
4. Submit PR

## License

Proprietary - SADDAH Team
