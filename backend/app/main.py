"""
ExpoVisionED Backend API
Main FastAPI application entry point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import engine, Base
from app.api import auth, courses, lessons, chat, users, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting ExpoVisionED Backend...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("📊 Database tables created")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down ExpoVisionED Backend...")


# Create FastAPI application
app = FastAPI(
    title="ExpoVisionED API",
    description="Educational platform with AI assistant",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ExpoVisionED Backend"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to ExpoVisionED API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "Something went wrong"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

