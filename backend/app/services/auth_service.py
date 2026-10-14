"""User accounts and credential checks."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import InvalidCredentialsError
from app.core.security import hash_password, verify_password
from app.models import User


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def get_active_user(db: Session, user_id: int) -> User | None:
    user = db.get(User, user_id)
    return user if user is not None and user.is_active else None


def authenticate(db: Session, email: str, password: str) -> User:
    """Return the matching active user, or raise `InvalidCredentialsError`.

    The same error is raised for unknown emails, wrong passwords and disabled accounts so the
    response never reveals which accounts exist.
    """
    user = get_user_by_email(db, email)
    password_ok = verify_password(password, user.password_hash if user else None)
    if user is None or not password_ok or not user.is_active:
        raise InvalidCredentialsError()
    return user


def create_user(db: Session, *, email: str, name: str, password: str) -> User:
    user = User(
        email=normalize_email(email), name=name.strip(), password_hash=hash_password(password)
    )
    db.add(user)
    db.commit()
    return user
