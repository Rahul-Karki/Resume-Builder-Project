#!/bin/bash
# Automated MongoDB backup script
# Usage: ./scripts/backup.sh [output-dir]
# Requires: mongodump (MongoDB Database Tools), .env file with MONGO_URI

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

MONGO_URI="${MONGO_URI:-}"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"

if [ -z "$MONGO_URI" ]; then
  echo "ERROR: MONGO_URI is not set"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$BACKUP_PATH"

echo "Starting MongoDB backup to $BACKUP_PATH..."
echo "Database: $(echo $MONGO_URI | grep -oP '(?<=/)[^/?]+(?=\?|$)')"

mongodump \
  --uri="$MONGO_URI" \
  --out="$BACKUP_PATH" \
  --gzip \
  --numParallelCollections=4

echo "Backup completed: $BACKUP_PATH"

# Keep only last 7 daily backups
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
echo "Cleaned up backups older than 7 days"

# Print backup size
du -sh "$BACKUP_PATH"
