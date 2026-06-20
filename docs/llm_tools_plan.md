# LLM Tools Plan

## Starting Context

The Tavi MVP uses a chatbot as the primary landing-page entry point. The chatbot should ask clarifying questions, create work orders, search/filter vendors, contact vendors, track bids, summarize bids, and recommend a winner.

Stack decisions:

- Backend: Python + FastAPI
- LLM provider: OpenRouter
- Model: DeepSeek V4 Flash
- Default configurable model id: `deepseek/deepseek-v4-flash`
- Database: SQLite through backend persistence

Important product constraints:

- `POST /api/llm/messages` is the generic endpoint for LLM interaction.
- LLM tools are only for DB reads/writes and external side effects.
- Summarizing bids and recommending a winner are model reasoning tasks over retrieved context, not dedicated tools.
- Email, text, and call actions are mocked by writing `communication_events`.
- The LLM should use the term "vendor", not "worker".

## Implementation Scope

Implement the LLM message endpoint and tool execution layer. Do not build frontend pages. Do not implement unrelated backend CRUD already owned by the backend foundation slice except where needed to call existing service functions.

## API Surface

Implement:

- `POST /api/llm/messages`

Expected request:

- `chat_session_id`, optional for continuing a chat.
- `message`, the facility manager's message.
- Optional `work_order_id` when the conversation is scoped to an existing work order.

Expected response:

- Assistant message text.
- `chat_session_id`.
- Optional `work_order_id`.
- Any tool calls performed, suitable for debug/demo display.

## OpenRouter Configuration

Use environment variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`, default `deepseek/deepseek-v4-flash`
- `OPENROUTER_BASE_URL`, default `https://openrouter.ai/api/v1`

Tests must mock OpenRouter and must not require a real API key.

## Tool Functions

Expose tool functions to the LLM:

- `create_work_order()`
- `update_work_order()`
- `get_work_order()`
- `get_work_order_bids()`
- `get_work_order_candidates()`
- `search_vendors()`
- `create_work_order_candidate()`
- `contact_vendor()`
- `send_vendor_email()`
- `send_vendor_text()`
- `log_vendor_call()`
- `create_bid()`
- `update_bid()`

Tool behavior:

- Tools should call backend service/database functions.
- `send_vendor_email`, `send_vendor_text`, and `log_vendor_call` should create `communication_events`.
- `search_vendors` should support city/trade/task/availability filters and price-quality fit via `vendor_task_stats`.
- `create_work_order_candidate` should be idempotent for existing work order/vendor pairs.

Do not create tools for:

- `summarize_bids`
- `recommend_winner`

The LLM should generate summaries and recommendations after using read tools such as `get_work_order_bids()` and `get_work_order_candidates()`.

## Prompt Requirements

The system prompt should instruct the model to:

- Act as Tavi's facility-manager assistant.
- Ask clarifying questions before creating a work order if trade, city/location, scope, timing, budget, or urgency is missing.
- Use tools for database reads/writes and contact side effects.
- Prefer vendors with strong median quality, reasonable median price, low risk, and availability within the requested window.
- Explain bid summaries and winner recommendations in clear operational language.
- Never claim that a real email/text/call was sent beyond the mock demo context.

## Tests

Add tests for:

- `POST /api/llm/messages` creates a chat session when none is provided.
- Chat messages are persisted.
- Mocked LLM tool calls dispatch to backend tool functions.
- `send_vendor_email`, `send_vendor_text`, and `log_vendor_call` write communication events.
- The endpoint can return an AI bid summary/recommendation without dedicated summary/recommendation tools.
- Missing OpenRouter API key produces a clear local-demo error unless test mode/mock mode is enabled.

## Acceptance Criteria

- The LLM endpoint works with mocked OpenRouter in tests.
- Tool execution can create work orders, search vendors, create candidates, contact vendors, and create/update bids.
- Summaries and winner recommendations are produced by the model using retrieved context.
- No frontend implementation is included in this slice.
