#!/bin/bash

# Database Restore Script for The Velvet Den
# This script restores the database to its current structure

set -e

DB_NAME="velvetden"
DB_USER="velvetden"
MIGRATION_FILE="src/main/resources/db/migration/V1__initial_schema.sql"

echo "🔄 Restoring database structure for The Velvet Den..."
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Run the migration script
echo "📝 Running migration script..."
psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database structure restored successfully!"
    echo ""
    echo "You can now connect to the database using:"
    echo "  psql -U $DB_USER -d $DB_NAME"
else
    echo ""
    echo "❌ Error: Failed to restore database structure"
    exit 1
fi

