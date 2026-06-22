from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import SessionLocal, engine
from .migrations import initialize_database as run_database_initialization
from .routers import auth, bids, candidates, chat, facilities, health, llm, timeline, vendors, work_orders
from .services.work_orders import create_wo_snapshot, update_bidding_mode_if_needed


def initialize_database():
    run_database_initialization(engine, SessionLocal)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Tavi Hackathon Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(facilities.router)
app.include_router(work_orders.router)
app.include_router(vendors.router)
app.include_router(candidates.router)
app.include_router(bids.router)
app.include_router(timeline.router)
app.include_router(chat.router)
app.include_router(llm.router)
