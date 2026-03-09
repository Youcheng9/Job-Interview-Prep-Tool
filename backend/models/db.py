from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Add this check! It will stop the crash and tell you the truth.
if DATABASE_URL is None:
    print("❌ ERROR: DATABASE_URL is None. Check your .env file location and keys.")
    # For debugging, let's see where Python thinks it is looking:
    print(f"Current Working Directory: {os.getcwd()}")
else:
    print("✅ DATABASE_URL found!")

engine = create_engine(DATABASE_URL, pool_pre_ping=True) #The actual source of 
                                                         #the connection to the database
                                                         #It pings the database making sure it
                                                         #is connected and avoid "Lost Connection to Server".

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False) #this creates a template and when we
                                                                            #talk to db, we call sessionlocal() to 
                                                                            #get a single transaction

class Base(DeclarativeBase): #It maps python classes to postgres tables
    pass

def get_db():   
    '''This is a Generator. It’s specifically designed for FastAPI "Dependency Injection.
    1. Open: It creates a new database session.
    2. Hand over: It "yields" (lends) the session to your FastAPI route.
    3. Cleanup: Once the API request is finished, it always runs the finally block to close the connection,
    ensuring you don't leak memory or crash your database with too many open connections.'''
    db = SessionLocal() 
    try:
        yield db
    finally:
        db.close()
        
        
