# Tavi Hackathon Design

## Goal

Build a simple end-to-end version of Tavi: an AI-native managed marketplace for creating a trade work order, discovering service vendors, contacting candidate vendors, collecting bids, recommending a winner, and awarding the job.

The product should feel like an operations command center. Agents do the leg work, while a human can inspect progress and intervene where needed.

## Assumptions

- The hackathon app should demonstrate the full workflow more than production-grade vendor sourcing.
- Vendor discovery, vendor contact, and bid collection can be mocked or simulated where needed.
- Mock vendor data should focus on NYC, LA, and Chicago for the project scope.
- Vendor scores are current summary attributes, so they live on `vendors`.
- A work order can involve many candidate vendors before one vendor is selected.
- Final award and scheduling data can live on `work_orders`; a separate dispatch table is not needed for the MVP.
- Work order state should be auditable through append-only status events.
- The UI can use the word "worker" for facility managers, while the data model uses `vendors`.

## Functional Requirements

### Work Order Intake

Facility managers can create a work order through a natural language interface or structured form.

The system extracts:

- Trade
- Service location
- Scope of work
- Requested date and time
- Target budget
- Urgency
- Quality requirements

The user can review and edit extracted fields before vendor discovery starts.

### Chatbot Landing Page

The landing page should center the chatbot as the primary entry point.

The chatbot input placeholder should read:

```text
Describe your work order and Tavi will finding matching vendors for your needs
```

When the facility manager uses the chatbot, the AI should handle the full workflow:

- Ask clarifying questions to gather important context.
- Create the work order.
- Search and filter workers.
- Create an auction when useful.
- Contact candidate workers.
- Track responses and bids.
- Summarize options.
- Recommend a winner.

The chatbot should ask for missing context at the start and throughout the conversation. Important context includes trade, location, scope, timing, budget, urgency, access instructions, license or insurance requirements, and whether the manager wants an auction.

### Manual Work Order Form

The app should include a page where facility managers can manually create a trade work order.

The form should include:

- Trade
- Facility or service address
- Scope of work
- Requested date and time
- Urgency
- Target budget
- Access instructions
- License or insurance requirements
- Attachments or notes, if available

While creating the work order, the manager should be able to create an auction with:

- Maximum price
- Bid deadline
- Work order details shown to vendors
- Required arrival window
- Required qualification criteria

The system should store the auction choice on the work order through `bidding_mode`, `max_price_cents`, and `bid_deadline_at`.

### Worker Search

The app should include a worker search page for browsing mocked service vendors.

The search scope should focus on:

- NYC
- LA
- Chicago

Users should be able to search workers by trade, including:

- Lawncare
- Plumbing
- Electrical
- HVAC
- Cleaning
- General maintenance

Users should be able to filter workers by:

- City
- Trade
- Distance
- Rating
- Review count
- License status
- Insurance status
- Quality score
- Price score
- Availability score
- Risk score

Search results should link to each worker's Tavi profile page.

### Worker Profile

Each worker should have a Tavi profile page.

The profile should show:

- Vendor name
- Trade
- City and service area
- Phone and email
- Rating and review count
- License status
- Insurance status
- Quality score
- Price score
- Availability score
- Risk score
- Score evidence
- Recent candidate/work order history, if available

From the worker profile, the facility manager should be able to choose a work order and click buttons to:

- Send email
- Send text message
- Call

Each contact action should include relevant work order information so the vendor has enough context to respond.

If the worker is not already attached to the selected work order, the contact action should create a `work_order_candidates` record before creating the communication event.

### Work Orders and Bids

The app should include a page where facility managers can see all work orders they created.

The page should show:

- Work order title
- Trade
- Location
- Status
- Bidding mode
- Bid deadline
- Number of candidate workers
- Number of bids
- Current best bid
- Recommended winner, if available

Users should be able to click into a work order to see:

- All bids
- Bid amount
- Arrival window
- Scope notes
- Bid status
- Worker details for each bidder
- Communication history with each bidder
- AI bid summary
- AI winner recommendation

The AI summary should compare the bids and explain the recommended winner.

### Vendor Discovery

The system finds relevant vendors near the service location and creates `work_order_candidates` records.

Vendor discovery should consider:

- Trade match
- Distance from the job
- Rating and review count
- License status
- Insurance status
- Quality score
- Price score
- Availability score
- Risk score

### Candidate Details

The system must show detailed information for each candidate vendor so the facility manager can understand why a vendor is or is not recommended.

Candidate details should include:

- Vendor name
- Trade
- Phone and email
- Distance from job
- Rating and review count
- License status
- Insurance status
- Quality score
- Price score
- Availability score
- Risk score
- Current candidate status
- Quoted price, if available
- Availability window, if available
- Last contacted time
- Next recommended action
- Relevant score evidence
- Recent communication history

### Vendor Contact Command Center

For each candidate, agents can simulate or perform contact over phone, email, or text.

All job and candidate activity should appear in one unified timeline:

- Agent actions
- Vendor replies
- Emails
- Text messages
- Calls
- Human notes
- Bid updates
- Status changes

### Conditional Bidding Mode

The system supports two bidding modes.

Transparent auction mode is used when there is enough vendor liquidity.

Private negotiation mode is used when there are too few viable vendors, because vendors may be able to hold prices higher if they can infer that demand is thin.

Suggested rule:

```text
3+ viable candidates -> transparent_auction
fewer than 3 viable candidates -> private_negotiation
```

A viable candidate is an interested candidate that has responded and meets the job's minimum quality bar.

For the MVP, a candidate is viable when:

- `status` is `interested`, `bid_submitted`, or `negotiating`
- Vendor has an acceptable `price_score`
- Vendor has an acceptable `risk_score`
- Vendor has acceptable license and insurance status for the job
- Vendor can meet the requested timing or provide a reasonable alternative

### Winner Recommendation

The system must recommend a winning vendor before award.

The recommendation should be explainable and based on candidate details, not only lowest price.

Recommended factors:

- Bid amount
- Arrival window
- Vendor quality score
- Availability score
- Risk score
- License and insurance status
- Responsiveness during contact
- Fit with requested scope and urgency

The command center should show:

- Recommended winner
- Reason for recommendation
- Best price option
- Best quality option
- Fastest available option
- Risk warnings, if any

The user can accept the recommendation or override it.

### Award and Scheduling

The facility manager selects the winning vendor.

The system records on `work_orders`:

- Selected vendor
- Accepted bid
- Accepted price
- Scheduled start time
- Confirmation status

### State Tracking

`work_orders.status` stores the current state.

`work_order_status_events` stores the full transition history.

Every meaningful work order state change should create a status event.

## Core Entities

- `users`
- `facilities`
- `work_orders`
- `work_order_status_events`
- `vendors`
- `work_order_candidates`
- `communication_events`
- `bids`
- `agent_actions`
- `chat_sessions`
- `chat_messages`

## Work Order States

Work order status is a closed enum. The system should only allow the values listed below.

```text
draft
intake_review
ready_for_vendor_discovery
discovering_vendors
vendors_shortlisted
contacting_vendors
collecting_bids
negotiating
ready_for_award
awarded
scheduled
in_progress
completed
cancelled
```

## Candidate Statuses

Candidate status is a closed enum. The system should only allow the values listed below.

```text
discovered
shortlisted
contact_pending
contacted
responded
interested
unavailable
needs_clarification
bid_submitted
negotiating
recommended
selected
not_selected
declined
```

`work_order_candidates.status` is the single source of truth for candidate workflow state. Shortlisting and recommendation should be represented through status values such as `shortlisted` and `recommended`, not separate boolean columns.

## Other Enumerated Values

```text
urgency:
low
normal
high
emergency
```

```text
bidding_mode:
transparent_auction
private_negotiation
```

```text
confirmation_status:
pending
confirmed
failed
cancelled
```

```text
license_status:
unknown
verified
unverified
expired
not_required
```

```text
insurance_status:
unknown
verified
unverified
expired
not_required
```

```text
channel:
system
phone
email
sms
chat
note
```

```text
direction:
inbound
outbound
internal
```

```text
actor_type:
system
agent
human
vendor
facility_manager
```

```text
bid_status:
submitted
accepted
rejected
withdrawn
expired
```

```text
agent_action_status:
pending
running
succeeded
failed
cancelled
```

```text
chat_session_status:
active
completed
abandoned
```

```text
chat_message_role:
facility_manager
assistant
system
tool
```

## Data Model

```sql
users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role text not null,
  created_at timestamp not null
)
```

```sql
facilities (
  id uuid primary key,
  user_id uuid not null references users(id),

  name text not null,
  address text not null,
  city text,
  state text,
  postal_code text,
  latitude numeric,
  longitude numeric,

  created_at timestamp not null,
  updated_at timestamp not null
)
```

```sql
work_orders (
  id uuid primary key,
  user_id uuid not null references users(id),
  facility_id uuid references facilities(id),

  title text not null,
  description text not null,
  trade text not null,
  status text not null, -- closed enum: see Work Order States

  requested_start_at timestamp,
  target_budget_cents integer,
  max_price_cents integer,
  bid_deadline_at timestamp,
  urgency text,
  bidding_mode text,

  selected_vendor_id uuid references vendors(id),
  accepted_bid_id uuid,
  accepted_price_cents integer,
  scheduled_start_at timestamp,
  confirmation_status text,

  created_at timestamp not null,
  updated_at timestamp not null
)
```

```sql
work_order_status_events (
  id uuid primary key,
  work_order_id uuid not null references work_orders(id),

  from_status text,
  to_status text not null, -- closed enum: see Work Order States
  reason text,
  actor_type text not null,
  actor_name text,
  metadata jsonb,

  created_at timestamp not null
)
```

```sql
vendors (
  id uuid primary key,

  name text not null,
  trade text not null,
  phone text,
  email text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,

  rating numeric,
  review_count integer,
  license_status text,
  insurance_status text,

  quality_score numeric,
  price_score numeric,
  availability_score numeric,
  risk_score numeric,
  score_evidence jsonb,

  created_at timestamp not null,
  updated_at timestamp not null
)
```

```sql
work_order_candidates (
  id uuid primary key,
  work_order_id uuid not null references work_orders(id),
  vendor_id uuid not null references vendors(id),

  status text not null, -- closed enum: see Candidate Statuses
  distance_miles numeric,

  quoted_price_cents integer,
  available_start_at timestamp,
  available_end_at timestamp,

  last_contacted_at timestamp,
  next_action text,

  created_at timestamp not null,
  updated_at timestamp not null,

  unique (work_order_id, vendor_id)
)
```

```sql
communication_events (
  id uuid primary key,

  work_order_id uuid not null references work_orders(id),
  work_order_candidate_id uuid references work_order_candidates(id),

  channel text not null,
  direction text not null,
  actor_type text not null,
  actor_name text,

  body text not null,
  metadata jsonb,

  created_at timestamp not null
)
```

```sql
bids (
  id uuid primary key,

  work_order_id uuid not null references work_orders(id),
  work_order_candidate_id uuid not null references work_order_candidates(id),

  amount_cents integer not null,
  arrival_window_start timestamp,
  arrival_window_end timestamp,
  scope_notes text,
  status text not null, -- closed enum: see bid_status

  submitted_at timestamp not null,
  created_at timestamp not null
)
```

```sql
agent_actions (
  id uuid primary key,

  work_order_id uuid not null references work_orders(id),
  work_order_candidate_id uuid references work_order_candidates(id),

  action_type text not null,
  status text not null, -- closed enum: see agent_action_status
  input jsonb,
  output jsonb,

  created_at timestamp not null,
  completed_at timestamp
)
```

```sql
chat_sessions (
  id uuid primary key,
  user_id uuid not null references users(id),
  work_order_id uuid references work_orders(id),

  status text not null, -- closed enum: see chat_session_status
  summary text,

  created_at timestamp not null,
  updated_at timestamp not null
)
```

```sql
chat_messages (
  id uuid primary key,
  chat_session_id uuid not null references chat_sessions(id),
  work_order_id uuid references work_orders(id),

  role text not null, -- closed enum: see chat_message_role
  body text not null,
  extracted_fields jsonb,
  created_at timestamp not null
)
```

## API Endpoints

### Work Orders

```http
POST /api/work-orders
GET /api/work-orders
GET /api/work-orders/:id
PATCH /api/work-orders/:id
```

```http
POST /api/work-orders/:id/parse
POST /api/work-orders/:id/discover-vendors
POST /api/work-orders/:id/start-bidding
POST /api/work-orders/:id/recommend-winner
POST /api/work-orders/:id/award
```

### Worker Search

```http
GET /api/vendors
GET /api/vendors/:id
POST /api/vendors/:id/contact
```

### Candidates

```http
GET /api/work-orders/:id/candidates
GET /api/work-order-candidates/:id
PATCH /api/work-order-candidates/:id
POST /api/work-order-candidates/:id/contact
POST /api/work-order-candidates/:id/messages
```

### Bids

```http
GET /api/work-orders/:id/bids
POST /api/work-orders/:id/bids
PATCH /api/bids/:id
```

### Timeline and Audit Trail

```http
GET /api/work-orders/:id/timeline
GET /api/work-orders/:id/status-events
```

### Chatbot

```http
POST /api/chat-sessions
GET /api/chat-sessions/:id
POST /api/chat-sessions/:id/messages
```

## High-Level Architecture

```text
Frontend
  Landing page with chatbot input
  Work order dashboard
  Manual work order form
  Worker search page
  Worker profile page
  Command center
  Candidate detail drawer
  Award review screen

Backend API
  Owns chatbot, work order state
  Owns candidates, bids, communication events, and status events

Agent workflow layer
  Asks clarifying questions
  Parses intake
  Discovers vendors
  Filters vendor search results
  Scores vendors
  Contacts candidates
  Creates auctions when requested
  Generates follow-ups
  Summarizes bids
  Recommends a winner

Database
  Stores durable workflow state and audit history
```

## Main Product Screen

The command center should be the core demo surface.

Suggested layout:

```text
Left: work order summary and current state
Center: unified communication timeline
Right: candidate pipeline, bid table, and recommendation
Drawer: detailed candidate profile and communication history
```

## End-to-End Demo Flow

1. Facility manager submits: "Need a plumber at 123 Main St Dallas Tuesday 5pm, target $250."
2. System parses the request and creates a draft work order.
3. User reviews and approves intake.
4. System discovers vendors and creates `work_order_candidates`.
5. System shows detailed candidate profiles.
6. System chooses bidding mode.
7. Agents contact candidates.
8. Candidate statuses update as vendors respond.
9. Bids come in.
10. System recommends a winner with an explanation.
11. User awards the job or overrides the recommendation.
12. `work_orders` is updated with selected vendor, accepted bid, scheduled time, and status.
13. `work_order_status_events` preserves the full state history.
