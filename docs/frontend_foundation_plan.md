# Frontend Foundation Plan

## Starting Context

The Tavi frontend should feel like a command center for trade work orders. Facility managers should start from a chatbot landing page, manually create work orders when needed, browse vendors, review bids, and click through to vendor profiles.

Stack decisions:

- Frontend: Next.js + React
- Backend API: FastAPI
- Database: SQLite behind the backend
- LLM: OpenRouter DeepSeek V4 Flash through backend `POST /api/llm/messages`

Important product context:

- Use the word "vendor" everywhere in the UI.
- Mock data focuses on NYC, LA, and Chicago.
- Main navigation hierarchy:

```text
Work order dashboard
  -> Work order review page
    -> Bid detail page
      -> Vendor profile page
```

## Implementation Scope

Scaffold the frontend app and shared UI/API foundation only. Do not build the full page functionality in this slice beyond route shells and reusable primitives.

## Routes

Configure routes:

- `/`
- `/work-orders`
- `/work-orders/new`
- `/work-orders/[id]`
- `/work-orders/[id]/bids/[bidId]`
- `/vendors`
- `/vendors/[id]`

## Shared Frontend Infrastructure

Create:

- API client wrapper for backend calls.
- Typed frontend models matching backend response shapes at a practical MVP level.
- App shell with navigation.
- Layout primitives for command-center style pages.
- Reusable UI primitives:
  - Buttons with icons where appropriate.
  - Tables.
  - Status badges.
  - Score badges.
  - Cards for repeated list items only.
  - Form fields.
  - Loading states.
  - Empty states.
  - Error states.

## API Client Coverage

Include client functions for:

- Work orders list/detail/create/update.
- Vendors list/detail/contact.
- Candidates list/detail/update/contact/message.
- Bids list/create/update.
- Timeline and states.
- Chat sessions and LLM messages.

The frontend should call backend endpoints only; do not call OpenRouter directly from the browser.

## Visual Direction

- The app should feel operational and dense enough for real work, not like a marketing landing page.
- The landing page can be simple, but the chatbot input should be the primary action.
- Use restrained styling with clear tables, status indicators, and scan-friendly layouts.
- Avoid duplicate command-center pages; the work order dashboard plus work order review page create the command-center feel.

## Tests

Add frontend tests for:

- App shell and navigation render.
- Route shells load for all planned routes.
- API client builds correct request paths.
- Shared table, badge, button, and form components render expected states.

## Acceptance Criteria

- Next.js app runs locally.
- All route shells are reachable.
- Shared API client and UI primitives are ready for page implementation.
- No backend schema or LLM work is included in this slice.
