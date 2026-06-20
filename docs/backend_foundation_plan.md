# Backend Foundation Plan

## Starting Context

Build the backend for a Tavi hackathon MVP. The product is a command center for facility managers to create trade work orders, discover vendors, collect bids, and select a recommended winner.

Stack decisions:

- Backend: Python + FastAPI
- Database: SQLite
- Frontend consumer: Next.js React app
- LLM integration: separate backend endpoint using OpenRouter DeepSeek V4 Flash

Important product constraints from `docs/design.md`:

- Mock vendor data focuses on NYC, LA, and Chicago.
- UI and API language should use "vendor", not "worker".
- Table names should use conventional plural snake_case.
- Auth is not required for the MVP; use seeded facility-manager context.
- Work order history is stored in `work_order_states`, not `work_order_status_events`.
- Vendor price fit is derived from completed work orders and `vendor_task_stats`, not a static `price_score`.

## Implementation Scope

Scaffold the FastAPI backend and SQLite persistence layer only. Do not build frontend pages or real LLM calls in this slice.

Create backend structure with:

- App entrypoint and health endpoint.
- SQLite connection/session setup.
- Schema creation or migrations for all MVP tables.
- Pydantic request/response models.
- Seedable local database.
- REST endpoints needed by the frontend and LLM tool layer.

## Data Model To Implement

Implement these tables:

- `companies`
- `users`
- `facilities`
- `work_orders`
- `work_order_states`
- `vendors`
- `vendor_task_stats`
- `vendor_availability_blocks`
- `work_order_candidates`
- `communication_events`
- `bids`
- `agent_actions`
- `chat_sessions`
- `chat_messages`

Important fields:

- `users.user_type` supports `facility_manager`, `vendor`, `admin`.
- `users.company_id` references `companies`.
- `work_orders.status` is a closed enum and excludes `intake_review`.
- `work_orders` stores award/scheduling fields: `selected_vendor_id`, `accepted_bid_id`, `accepted_price_cents`, `scheduled_start_at`, `confirmation_status`, `completed_vendor_quality_score`.
- `work_order_states` stores a snapshot of work order details at each state.
- `vendors` stores quality, availability, and risk scores, but no static `price_score`.
- `vendor_task_stats` stores median price and median quality by vendor, trade, task type, and city.
- `vendor_availability_blocks` stores vendor available time windows.

## API Surface

Implement backend endpoints:

- `POST /api/work-orders`
- `GET /api/work-orders`
- `GET /api/work-orders/{id}`
- `PATCH /api/work-orders/{id}`
- `GET /api/vendors`
- `GET /api/vendors/{id}`
- `POST /api/vendors/{id}/contact`
- `GET /api/work-orders/{id}/candidates`
- `GET /api/work-order-candidates/{id}`
- `PATCH /api/work-order-candidates/{id}`
- `POST /api/work-order-candidates/{id}/contact`
- `POST /api/work-order-candidates/{id}/messages`
- `GET /api/work-orders/{id}/bids`
- `POST /api/work-orders/{id}/bids`
- `PATCH /api/bids/{id}`
- `GET /api/work-orders/{id}/timeline`
- `GET /api/work-orders/{id}/states`
- `POST /api/chat-sessions`
- `GET /api/chat-sessions/{id}`
- `POST /api/chat-sessions/{id}/messages`

Do not implement the removed workflow-specific endpoints:

- `POST /api/work-orders/{id}/parse`
- `POST /api/work-orders/{id}/discover-vendors`
- `POST /api/work-orders/{id}/start-bidding`
- `POST /api/work-orders/{id}/recommend-winner`
- `POST /api/work-orders/{id}/award`

Those behaviors are handled through generic LLM messages and tools in another slice.

## Required Behavior

- Creating or updating a work order should insert a `work_order_states` snapshot when status or important work order fields change.
- Vendor search should support filters for city, trade, rating, license status, insurance status, quality score, price fit, availability score, and risk score.
- Price fit should be computed from `vendor_task_stats` against the requested trade/task/city, not from `vendors`.
- Candidate creation should enforce one candidate per `(work_order_id, vendor_id)`.
- Contact endpoints should write `communication_events` and update candidate contact fields when applicable.
- Bid endpoints should support creating, listing, and updating bid status.
- Timeline endpoint should combine communication events, bids, and relevant work order state snapshots in chronological order.

## Tests

Add backend tests for:

- Schema creation succeeds on a fresh SQLite database.
- Work order create/list/detail/update.
- Work order state snapshots are inserted on meaningful state changes.
- Vendor search filters by city/trade and uses `vendor_task_stats` for price fit.
- Candidate creation is idempotent for the same work order/vendor.
- Contact actions create communication events.
- Bid creation/list/update.
- Timeline returns combined chronological activity.

## Acceptance Criteria

- Backend can run locally with SQLite.
- Tests pass without requiring OpenRouter credentials.
- Seeded data can support the frontend pages and LLM tools.
- No frontend implementation is included in this slice.
