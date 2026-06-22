# Tavi Frontend

Next.js (App Router) frontend for the Tavi command center.

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Backend

The frontend expects the FastAPI backend (see the [root README](../README.md)) running at `http://localhost:8000`. Start it first:

```bash
cd ../backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

The frontend calls the backend at `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`). To point at a different backend, set it in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`; sign in with a seeded login token or vendor business name (see "Test login credentials" in the root README).

## Routes

- `/login` — sign in with a login token or vendor business name
- `/tavi` — shared Tavi agent page for facility managers and vendors
- `/` and `/home` — redirects to `/tavi`
- `/work-orders` — work order dashboard
- `/work-orders/new` — manual work order creation form
- `/work-orders/[id]` — work order review page
- `/work-orders/[id]/bids/[bidId]` — bid detail page
- `/vendors` — vendor search
- `/vendors/[id]` — vendor profile
- `/facilities` — facility list
- `/vendor/marketplace` — vendor-facing marketplace of open work orders plus the vendor's submitted bids

Facility managers see Tavi, Work Orders, Facilities, and Vendors navigation. Vendors see Tavi and Marketplace navigation.

## Run tests

```bash
npm test
```

## Typecheck

```bash
npx tsc --noEmit
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
