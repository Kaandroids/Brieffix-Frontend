# Briefix — Frontend

Angular frontend for [Brief-Fix](https://www.brief-fix.de), a German letter creation web app.

**Live Demo:** [www.brief-fix.de](https://www.brief-fix.de) Generates professionally formatted DIN 5008 letters as PDFs compatible with DIN-A4 window envelopes.

## Tech Stack

- **Angular 17+** — standalone components, signals
- **SCSS** — custom design system
- **Web Speech API** — voice input for letter content
- **Nginx** — serves the production build inside Docker
- **Docker** → deployed on **Google Cloud Run**

## Features

- Landing page with feature overview
- Email/password and Google OAuth sign-in & registration
- Email verification flow
- Dashboard with letter, contact, and profile management
- Letter creation form with live PDF preview (iframe) or direct download on mobile
- Multiple letter template styles (classic, professional)
- AI letter generation ("Mit KI erstellen") via backend Gemini integration
- Voice input for letter body (mic button, hidden if unsupported)
- Sender profile management (individual & organization)
- Recipient contact management
- Public letter builder at `/erstellen` (no login required, rate-limited)

## Project Structure

```
src/app/
├── components/
│   ├── navbar/        # Shared navigation bar
│   └── footer/        # Shared footer
├── pages/
│   ├── landing/       # Public landing page
│   ├── generate/      # Public letter builder (/erstellen)
│   ├── ueber-uns/     # About page
│   ├── login/         # Login
│   ├── register/      # Registration
│   ├── verify-email/  # Email verification
│   ├── check-email/   # Post-registration prompt
│   ├── dashboard/     # Authenticated dashboard shell
│   ├── dashboard-home/# Dashboard home
│   ├── letters/       # Letter creation & management
│   ├── contacts/      # Contact management
│   ├── profiles/      # Sender profile management
│   └── settings/      # User settings
└── services/          # HTTP services (auth, letters, contacts, profiles, AI)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm start
```

The app will be available at `http://localhost:4200`. It proxies API requests to the backend at `http://localhost:8080` by default.

### Build

```bash
npm run build
```

Output is placed in `dist/`.

### Run with Docker

```bash
docker build -t briefix-frontend .
docker run -p 80:80 briefix-frontend
```

## Mobile Behavior

- PDF preview iframe is replaced with a direct download button on screens `<= 768px`
- Dashboard sidebar becomes a hamburger slide-in drawer on mobile
