# Tavi Frontend

Next.js (App Router) frontend for the Tavi command center, scaffolded per `docs/frontend_foundation_plan.md`.

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Routes available in this slice:

- `/` — landing page with chatbot input
- `/work-orders` — work order dashboard
- `/work-orders/new` — manual work order creation form
- `/work-orders/[id]` — work order review page
- `/work-orders/[id]/bids/[bidId]` — bid detail page
- `/vendors` — vendor search
- `/vendors/[id]` — vendor profile

The app calls a backend API at `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`). No backend exists yet in this slice, so API calls will fail until that's built — the UI shells still render.

## Run tests

```bash
npm test
```

## Lint

```bash
npm run lint
```

## Build for production

```bash
npm run build
npm start
```
