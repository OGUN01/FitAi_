#!/usr/bin/env python3
"""
Apply Supabase Migrations Script
Applies all 5 migrations in order using PostgreSQL direct connection
"""

import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    os.system("pip install psycopg2-binary")
    import psycopg2

# Database connection string
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
DB_HOST = "db.mqfrwtmkokivoxgukgsz.supabase.co"
DB_USER = "postgres"
DB_PASSWORD = input("Enter your Supabase database password: ")
DB_NAME = "postgres"

# Migration files in order
migrations = [
    "20250115000001_add_cache_tables.sql",
    "20250115000002_add_media_tables.sql",
    "20250115000003_add_logging_tables.sql",
    "20250115000004_add_rls_policies.sql",
    "20250115000005_add_helper_functions.sql",
]

def apply_migration(cursor, filename):
    filepath = Path("supabase/migrations") / filename
    print(f"\n📄 Reading migration: {filename}")

    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()

    print(f"   SQL size: {len(sql)} characters")
    print(f"🔄 Applying migration...")

    try:
        cursor.execute(sql)
        print(f"✅ Successfully applied: {filename}")
        return True
    except Exception as e:
        print(f"❌ Error applying {filename}:")
        print(f"   {str(e)}")
        raise

def main():
    print("🚀 Starting Supabase migrations...")
    print(f"📡 Target: {DB_HOST}")
    print(f"📋 Total migrations: {len(migrations)}\n")

    # Connect to database
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=5432
        )
        conn.autocommit = True
        cursor = conn.cursor()
        print("✅ Connected to database\n")
    except Exception as e:
        print(f"❌ Failed to connect to database:")
        print(f"   {str(e)}")
        sys.exit(1)

    # Apply migrations
    results = []
    for migration in migrations:
        try:
            apply_migration(cursor, migration)
            results.append(migration)
        except Exception as e:
            print(f"\n💥 Migration failed: {migration}")
            print("⚠️  Stopping migration process.")
            cursor.close()
            conn.close()
            sys.exit(1)

    # Close connection
    cursor.close()
    conn.close()

    # Success summary
    print("\n" + "=" * 60)
    print("🎉 All migrations completed successfully!")
    print("=" * 60)
    print("\n📊 Summary:")
    for i, migration in enumerate(results, 1):
        print(f"   {i}. ✅ {migration}")
    print()

if __name__ == "__main__":
    main()
