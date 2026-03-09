from backend.models.db import engine, Base
from backend.models import models  # IMPORTANT: ensures models are registered

def main():
    Base.metadata.create_all(bind=engine)
    print("Tables created!")

if __name__ == "__main__":
    main()