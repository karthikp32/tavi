# Integration, Seed, and Test Plan

## Starting Context

This slice makes the app demoable end to end. It should coordinate the backend, frontend, SQLite seed data, and mocked LLM behavior.

Stack decisions:

- Database: SQLite
- Backend: Python + FastAPI
- Frontend: Next.js + React
- LLM provider: OpenRouter DeepSeek V4 Flash, mocked in automated tests

Important product flow:

1. Facility manager submits or manually creates a work order.
2. System searches vendors and creates `work_order_candidates`.
3. Vendors are contacted through mocked email/text/call events.
4. Bids are collected.
5. LLM summarizes bids and recommends a winner.
6. Facility manager selects the winning vendor.
7. `work_order_states` preserves state history.

## Implementation Scope

Create seed data, local run instructions, and integration tests. Do not implement missing backend/frontend features directly; this slice should wire and verify the components once available.

## Seed Data

Create deterministic seed data for:

- One facility-manager company.
- One facility-manager user.
- Facilities in NYC, LA, and Chicago.
- Vendor companies and vendors across:
  - Plumbing
  - Electrical
  - Lawncare
  - HVAC
  - Cleaning
  - General maintenance
- Vendor scores:
  - Quality score
  - Availability score
  - Risk score
  - License status
  - Insurance status
- `vendor_task_stats` with median price and median quality by city/trade/task type.
- `vendor_availability_blocks` with soonest and longer availability windows.
- Sample work orders.
- Work order candidates.
- Bids.
- Communication events.
- Work order state snapshots.
- Chat sessions/messages for one demo conversation.

## Demo Scenarios

Support these demo flows:

### Chatbot Flow

- User starts on `/`.
- User describes a plumbing work order.
- Mocked LLM asks clarifying questions if needed.
- LLM tools create work order, search vendors, create candidates, contact vendors, and create bids.
- LLM returns a bid summary and winner recommendation.
- User clicks through to the work order review page.

### Manual Flow

- User opens `/work-orders/new`.
- User creates work order with auction max price and bid deadline.
- User lands on work order review page.
- User reviews candidate vendors, bids, and timeline.

### Browse Flow

- User opens `/vendors`.
- User filters vendors by city/trade.
- User opens vendor profile.
- User sends email/text/logs call for a selected work order.

### Review Flow

- User opens `/work-orders`.
- User opens a work order.
- User opens a bid detail.
- User opens the vendor profile from the bid.

## Integration Tests

Add smoke tests for:

- Backend starts and health endpoint responds.
- SQLite seed script creates expected row counts.
- Frontend starts and key routes load.
- Work order creation works through API.
- Vendor search returns seeded vendors.
- Candidate and bid APIs work.
- Timeline includes communication events and state snapshots.
- LLM endpoint works with mocked OpenRouter and mocked tool calls.
- Dashboard to work order review to bid detail to vendor profile navigation works.

## Local Run Instructions

Document:

- Backend setup.
- Frontend setup.
- SQLite seed/reset command.
- Required env vars.
- How to run mocked LLM mode.
- How to run with a real OpenRouter API key.
- How to run backend tests.
- How to run frontend tests.
- How to run integration smoke tests.

## Acceptance Criteria

- A new developer can seed and run the demo locally from documented commands.
- Automated tests do not require real OpenRouter credentials.
- Manual demo can use real OpenRouter by setting `OPENROUTER_API_KEY`.
- The seeded app demonstrates the full end-to-end Tavi workflow.
