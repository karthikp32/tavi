# Tavi

Tavi is an AI-native command center for facility managers to manage trade work orders, discover vendors, collect bids, and select winners. This repository contains the FastAPI backend, SQLite persistence layer, and the Next.js frontend.

---

## Frontend

The frontend lives in `frontend/` (Next.js App Router).

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See `frontend/README.md` for routes, tests, lint, and build commands.

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

### Seeding the Database

To create the SQLite database schema and populate it with mock companies, facilities, vendors, task stats, and availability blocks for New York, Los Angeles, and Chicago, run:

```bash
python -m app.seed
```

This will create a `tavi.db` file in the `backend/` directory.

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