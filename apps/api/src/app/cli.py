import argparse
from getpass import getpass

from sqlalchemy import select

from app.db import SessionLocal
from app.models import User
from app.security import password_hasher


def create_admin():
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.is_superadmin.is_(True))):
            raise SystemExit("An administrator already exists")
        email = input("Email: ").strip()
        username = input("Username: ").strip()
        password = getpass("Password (12+ characters): ")
        if len(password) < 12:
            raise SystemExit("Password is too short")
        db.add(User(email=email, username=username, password_hash=password_hasher.hash(password), is_active=True, is_superadmin=True))
        db.commit()
        print("Administrator created")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["create-admin", "reset-password"])
    args = parser.parse_args()
    if args.command == "create-admin":
        create_admin()
    else:
        email = input("Email: ").strip()
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == email, User.is_superadmin.is_(True)))
            if user is None:
                raise SystemExit("Administrator not found")
            password = getpass("New password (12+ characters): ")
            if len(password) < 12:
                raise SystemExit("Password is too short")
            user.password_hash = password_hasher.hash(password)
            db.commit()
            print("Password changed")


if __name__ == "__main__":
    main()
