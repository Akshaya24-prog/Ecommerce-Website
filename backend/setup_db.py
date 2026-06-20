"""
Run this script once to create the PostgreSQL database, user, and all tables.
Usage: python setup_db.py
"""
import os
import sys
import getpass
import secrets
import subprocess

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("psycopg2 not found. Run: pip install psycopg2-binary")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# App database config — change these or set them in .env before running
DB_NAME = "ecommerce_db"
DB_USER = "ecommerce_user"
DB_PASSWORD = "ecommerce_pass123"
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
ADMIN_USER = "postgres"  # PostgreSQL superuser


def create_env_file():
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        print("[skip] .env already exists")
        return
    secret_key = secrets.token_urlsafe(50)
    content = (
        f"SECRET_KEY={secret_key}\n"
        f"DEBUG=True\n"
        f"ALLOWED_HOSTS=127.0.0.1,localhost\n\n"
        f"DB_NAME={DB_NAME}\n"
        f"DB_USER={DB_USER}\n"
        f"DB_PASSWORD={DB_PASSWORD}\n"
        f"DB_HOST={DB_HOST}\n"
        f"DB_PORT={DB_PORT}\n\n"
        f"CORS_ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,"
        f"http://127.0.0.1:8080,http://localhost:8080\n"
    )
    with open(env_path, "w") as f:
        f.write(content)
    print("[ok]   Created .env with generated SECRET_KEY")


def setup_database(admin_password):
    print(f"\nConnecting to PostgreSQL as '{ADMIN_USER}'...")
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=ADMIN_USER,
            password=admin_password,
            host=DB_HOST,
            port=DB_PORT,
        )
    except psycopg2.OperationalError as e:
        print(f"[error] Cannot connect to PostgreSQL: {e}")
        return False

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Create role if not exists
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (DB_USER,))
    if cur.fetchone():
        print(f"[skip] Role '{DB_USER}' already exists")
    else:
        cur.execute(
            sql.SQL("CREATE USER {} WITH PASSWORD %s").format(sql.Identifier(DB_USER)),
            (DB_PASSWORD,),
        )
        print(f"[ok]   Created role '{DB_USER}'")

    # Create database if not exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    if cur.fetchone():
        print(f"[skip] Database '{DB_NAME}' already exists")
    else:
        cur.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(DB_NAME), sql.Identifier(DB_USER)
            )
        )
        print(f"[ok]   Created database '{DB_NAME}'")

    # Ensure privileges
    cur.execute(
        sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
            sql.Identifier(DB_NAME), sql.Identifier(DB_USER)
        )
    )
    print(f"[ok]   Granted privileges on '{DB_NAME}' to '{DB_USER}'")

    cur.close()
    conn.close()
    return True


def run_migrations():
    manage = os.path.join(BASE_DIR, "manage.py")
    print("\nRunning migrations...")
    result = subprocess.run([sys.executable, manage, "migrate"], cwd=BASE_DIR)
    return result.returncode == 0


if __name__ == "__main__":
    print("=== Ecommerce App — Database Setup ===\n")

    create_env_file()

    admin_pass = getpass.getpass(f"Enter PostgreSQL '{ADMIN_USER}' superuser password: ")

    if not setup_database(admin_pass):
        sys.exit(1)

    if not run_migrations():
        print("\n[error] Migration failed.")
        sys.exit(1)

    print("\n=== Setup complete! ===")
    print("Start the server:  cd backend && python manage.py runserver")
    print(f"DB user:           {DB_USER}")
    print(f"DB password:       {DB_PASSWORD}")
    print("(These are already written to your .env file)")
