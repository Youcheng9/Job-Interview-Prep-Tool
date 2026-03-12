from sqlalchemy.orm import Session
from backend.models.models import User

DEV_EMAIL = "dev@example.com"

def get_or_create_dev_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEV_EMAIL).first()
    if user:
        return user

    user = User(email=DEV_EMAIL, password_hash="dev")  # placeholder hash for now
    db.add(user)
    db.flush()  # assigns user.id
    return user