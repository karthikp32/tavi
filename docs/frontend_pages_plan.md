# Frontend Pages Plan

## Starting Context

This slice builds the actual user-facing pages on top of the Next.js frontend foundation. The product should feel like a command center for trade work orders.

Relevant product rules:

- Use "vendor", not "worker".
- Landing page centers the chatbot.
- Facility managers can manually create work orders and auctions.
- Vendor search uses mocked vendors in NYC, LA, and Chicago.
- Work order dashboard shows high-level details.
- Work order review page shows bids, candidate vendors, timeline, AI summary, and recommended winner.
- Bid detail page links to vendor profile.

## Implementation Scope

Implement page-level UI and backend integration using the shared frontend foundation. Do not implement backend endpoints or LLM internals in this slice.

## Pages To Build

### Landing Page `/`

Build the chatbot-first landing page.

The chatbot input placeholder must be exactly:

```text
Describe your work order and Tavi will finding matching vendors for your needs
```

Behavior:

- User sends a message to `POST /api/llm/messages`.
- Show conversation messages.
- Show loading/error state.
- If a work order is created or returned, link to the work order review page.

### Manual Work Order Form `/work-orders/new`

Fields:

- Trade
- Facility/service address
- Scope of work
- Requested date/time
- Urgency
- Target budget
- Access instructions
- License/insurance requirements
- Auction toggle
- Maximum price
- Bid deadline
- Required arrival window
- Qualification criteria

On submit:

- Create work order.
- Navigate to its review page.

### Vendor Search `/vendors`

Filters:

- City
- Trade
- Distance
- Rating
- Review count
- License status
- Insurance status
- Quality score
- Price fit
- Availability score
- Risk score

Results:

- Vendor name, trade, city, rating, quality, price fit, availability, risk, license/insurance status.
- Link each row/card to vendor profile.

### Vendor Profile `/vendors/[id]`

Show:

- Vendor identity/contact info.
- Trade and service area.
- Rating/reviews.
- License/insurance.
- Quality, price fit, availability, risk.
- Score evidence.
- Work-order-specific candidate details when opened with a work order context.

Actions:

- Select a work order.
- Send email.
- Send text.
- Log call.

Actions should call backend contact endpoints and show the resulting communication event state.

### Work Order Dashboard `/work-orders`

Show high-level details for all facility-manager work orders:

- Title
- Trade
- Location
- Status
- Bidding mode
- Bid deadline
- Number of candidate vendors
- Number of bids
- Current best bid
- Recommended winner, if available

Clicking a work order opens `/work-orders/[id]`.

### Work Order Review Page `/work-orders/[id]`

Show:

- Work order summary and current state.
- Candidate vendor list.
- Outreach/timeline stream.
- Bid table.
- AI bid summary.
- AI winner recommendation.
- Recommended next actions.

Click behavior:

- Click a bid to open `/work-orders/[id]/bids/[bidId]`.
- Click a vendor to open `/vendors/[id]`.

### Bid Detail Page `/work-orders/[id]/bids/[bidId]`

Show:

- Work order title/scope.
- Vendor that submitted the bid.
- Bid amount.
- Arrival window.
- Scope notes.
- Bid status.
- Assumptions/exclusions.
- Communication history related to the bid.
- AI notes about strengths, risks, and fit.

Link to vendor profile.

## Tests

Add tests for:

- Landing chatbot sends message and renders assistant response.
- Manual work order form validates required fields and submits.
- Vendor search filters update backend query.
- Vendor profile contact actions call correct API.
- Work order dashboard renders list and navigates to detail.
- Work order review renders bids, timeline, and recommendation sections.
- Bid detail links to vendor profile.

## Acceptance Criteria

- All planned pages are usable against the backend API.
- UI uses "vendor" consistently.
- The command-center feel comes from dashboard plus work order review page.
- No backend schema or LLM internal implementation is included in this slice.
