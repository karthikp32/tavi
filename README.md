# Tavi

Tavi is an AI-native command center for facilities work. Facility managers use it to create work orders, manage facilities, discover vendors, collect bids, and choose winners. Vendors use it to review marketplace work, ask the Tavi agent about eligible jobs and lowest-bid context, and place bids.

This repository contains:

* **Backend**: FastAPI, SQLAlchemy, SQLite, seed data, and the OpenRouter-backed agent/tool loop.
* **Frontend**: Next.js App Router UI for facility managers and vendors.
* **Agent tools**: role-scoped database tools for work orders, facilities, vendors, communications, marketplace listings, and bids.

---

## Frontend

The frontend lives in `frontend/` (Next.js App Router).

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See `frontend/README.md` for routes, tests, lint, and build commands.

Important routes:

* `/login` - sign in with a facility-manager token, vendor token, or vendor business name.
* `/tavi` - shared Tavi agent page for both facility managers and vendors.
* `/work-orders`, `/facilities`, `/vendors` - facility-manager workspaces.
* `/vendor/marketplace` - vendor marketplace and bid status view.
* `/` and `/home` - redirect to `/tavi`.

---

## Backend

### Prerequisites

* **Python 3.12** (specifically python 3.12.x to avoid package compilation issues)
* **SQLite** (built-in with Python)

### Setup Instructions

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python3.12 -m venv .venv
   ```

3. **Activate the virtual environment**:
   * On Linux/macOS:
     ```bash
     source .venv/bin/activate
     ```
   * On Windows:
     ```bash
     .venv\Scripts\activate
     ```

4. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   ```
   ```bash
   pip install -r requirements.txt
   ```

### Environment Variables

Create a `backend/.env` file (loaded automatically via `python-dotenv`) with:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key
# Optional, defaults shown:
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DATABASE_URL=sqlite:///./tavi.db
```

`OPENROUTER_API_KEY` is required for model-backed chat responses. Guardrail refusals and non-agent API routes can still work without it.

### Database Seeding

The backend creates the SQLite schema and seeds demo companies, facilities, work orders, vendors, task stats, and availability blocks automatically on startup when the database is empty. You do not need to run a separate seed command for normal local development.

The default SQLite URL is `sqlite:///./tavi.db`, so the file is created relative to the directory where you start the backend. If you run the backend from `backend/`, the file is `backend/tavi.db`.

Seed data includes 90 Yelp-backed local vendors: five vendors per trade, per city, across New York, Los Angeles, and Chicago.

#### Test login credentials

Most endpoints require an `X-Tavi-Login-Token` header (set automatically by the frontend after you log in at `/login`). Seeded tokens you can use for local testing:

* **Facility manager**: `facility-manager-1`
* **Vendor tokens**: `<trade-slug>-<n>`, e.g. `plumber-1`, `electrician-3`, `hvac-tech-2`, `cleaner-1`, `landscaper-1`, `maintenance-tech-1`
* **Vendor business names**: use a seeded business name directly, e.g. `Sam's Plumbing Services` or `DB Electric`

Vendor token numbering runs 1-15 per trade, with five vendors per trade in each demo city.

To intentionally reset and reseed the database, run:

```bash
python -m app.seed
```

### Running the Backend

Start the Uvicorn development server:

```bash
uvicorn app.main:app --reload
```

The API will be available locally at `http://127.0.0.1:8000`. You can explore the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.

### Running Tests

To run the complete test suite (incorporating database CRUD, candidacy lifecycle, bids, and the multi-turn LLM tools mock loop):

```bash
PYTHONPATH=. .venv/bin/pytest tests/
```

Common focused checks:

```bash
PYTHONPATH=. .venv/bin/pytest tests/test_backend.py
PYTHONPATH=. .venv/bin/pytest tests/test_llm.py
```

### Directory Structure

```text
backend/
├── app/
│   ├── database.py   # SQLite connection and session local setups
│   ├── main.py       # FastAPI application and route endpoints
│   ├── models.py     # SQLAlchemy ORM models
│   ├── schemas.py    # Pydantic request and response schemas
│   ├── seed.py       # Repeatable database seeding scripts
│   └── llm.py        # OpenRouter DeepSeek connector and tool loops
├── tests/
│   ├── test_backend.py  # Unit tests for core database, CRUD, and API handlers
│   └── test_llm.py      # Unit tests for chat, message persistence, and tool logic
└── requirements.txt  # Project requirements
```

---

## Design Decisions

### LLM Safety Guardrails

For the scope of this project, Tavi uses role-specific system prompts and server-side tool allowlists to keep facility-manager and vendor chats focused on work orders, facilities, vendors, marketplace bidding, and bid actions. The prompts explicitly instruct the model to refuse unrelated requests and prompt-injection attempts, while the backend only exposes the tools each actor type is allowed to use.

In production, Tavi would add a dedicated safety classifier plus industry-leading input and output guardrails before and after the LLM call. Those layers would classify unsafe or off-domain input, detect prompt injection, validate generated responses, and block unsafe outputs before they reach the UI.

### Role Boundaries

Facility managers can use Tavi to create and inspect their own work orders, list their facilities, discover vendors, contact vendors, collect bids, and compare bid outcomes.

Vendors can use Tavi to inspect marketplace work that matches their profile, see lowest-bid context without exposing competing vendor identities, and submit their own bids. Vendor chat history and marketplace status are scoped to the authenticated vendor.

### Dynamic Vendor Price Fit Calculation

When searching for vendors in the marketplace via the `search_vendors` tool, the system calculates a dynamic `price_fit` score (ranging from `0.0` to `1.0`) to indicate how well a vendor's pricing matches the user's budget expectations.

#### 1. With a User-Specified Budget (`target_budget` is provided)
If the facility manager has set an explicit target budget, the price fit is calculated as:

* **Perfect Match (`1.0`)**: If the vendor's historical median price is less than or equal to the target budget, `price_fit = 1.0`.
* **Gradual Decay**: If the vendor's median price exceeds the target budget, the score decays linearly toward `0.0`:

```text
price_fit = max(0.0, 1.0 - ((median_price - target_budget) / target_budget))
```

#### 2. Without a User-Specified Budget (`target_budget` is omitted)
When the target budget is unknown, the system uses the **local market average median price** of all vendors matching the trade and city as the baseline:

```text
avg_median = sum(median_price values for matching vendors) / matching_vendor_count
```

The price fit is then calculated using the market average:

* **Competitive Fit (`1.0`)**: If the vendor's median price is equal to or below the local market average, `price_fit = 1.0`.
* **Above-Average Penalty**: If the vendor's median price is higher than the local market average, the score decays relative to the average:

```text
price_fit = max(0.0, 1.0 - ((median_price - avg_median) / avg_median))
```
