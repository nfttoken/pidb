import argparse
import asyncio
import getpass

from sqlalchemy import select

from app.core.database import SessionFactory, engine
from app.core.security import hash_password
from app.models.auth import User
from app.workers.shopify import process_pending_shopify_jobs


async def create_admin(email: str, name: str, password: str) -> None:
    async with SessionFactory() as db:
        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            raise SystemExit(f"A user with email {email} already exists")
        db.add(
            User(
                email=email,
                name=name,
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
            )
        )
        await db.commit()
    await engine.dispose()
    print(f"Created admin user: {email}")


async def ensure_admin(email: str, name: str, password: str) -> None:
    async with SessionFactory() as db:
        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"Admin user already exists: {email}")
            return
        db.add(
            User(
                email=email,
                name=name,
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
            )
        )
        await db.commit()
    await engine.dispose()
    print(f"Created admin user: {email}")


async def process_shopify_jobs(limit: int) -> None:
    async with SessionFactory() as db:
        jobs = await process_pending_shopify_jobs(db, limit=limit)
        print(f"Processed Shopify jobs: {len(jobs)}")
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="PIDB local administration commands")
    subparsers = parser.add_subparsers(dest="command", required=True)
    admin_parser = subparsers.add_parser("create-admin")
    admin_parser.add_argument("--email", required=True)
    admin_parser.add_argument("--name", required=True)
    admin_parser.add_argument("--password")
    ensure_parser = subparsers.add_parser("ensure-admin")
    ensure_parser.add_argument("--email", required=True)
    ensure_parser.add_argument("--name", required=True)
    ensure_parser.add_argument("--password", required=True)
    jobs_parser = subparsers.add_parser("process-shopify-jobs")
    jobs_parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    if args.command == "create-admin":
        password = args.password or getpass.getpass("Password: ")
        asyncio.run(create_admin(args.email, args.name, password))
    elif args.command == "ensure-admin":
        asyncio.run(ensure_admin(args.email, args.name, args.password))
    elif args.command == "process-shopify-jobs":
        asyncio.run(process_shopify_jobs(args.limit))


if __name__ == "__main__":
    main()
