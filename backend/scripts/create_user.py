"""Create a LeadFlow user account.

Usage (from `backend/`):
    uv run python -m scripts.create_user --email rep@acme.com --name "Jane Rep"

The password is prompted for (not echoed), or read from the LEADFLOW_PASSWORD environment
variable for non-interactive use.
"""

import argparse
import getpass
import os
import sys

from app.db.session import SessionLocal
from app.services import auth_service

MIN_PASSWORD_LENGTH = 8


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a LeadFlow user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()

    password = os.environ.get("LEADFLOW_PASSWORD") or getpass.getpass("Password: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    with SessionLocal() as db:
        if auth_service.get_user_by_email(db, args.email):
            sys.exit(f"A user with email {args.email} already exists.")
        user = auth_service.create_user(db, email=args.email, name=args.name, password=password)
        print(f"Created user {user.email} (id {user.id}).")


if __name__ == "__main__":
    main()
