#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# PostgreSQL backup script for my-fridge (runs on Raspberry Pi host)
#
# Usage:
#   ./backup-db.sh              # backs up production (docker-compose.yml)
#   ./backup-db.sh staging      # backs up staging   (docker-compose.staging.yml)
#
# Cron example (every day at 3 AM):
#   0 3 * * * /home/pi/my-fridge/backup-db.sh >> /var/log/my-fridge-backup.log 2>&1
#   0 4 * * * /home/pi/my-fridge/backup-db.sh staging >> /var/log/my-fridge-backup.log 2>&1
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV="${1:-production}"

case "$ENV" in
  production)
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
    DB_NAME="my_fridge_db"
    ;;
  staging)
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.staging.yml"
    DB_NAME="my_fridge_db_staging"
    ;;
  *)
    echo "Unknown environment: $ENV (use 'production' or 'staging')"
    exit 1
    ;;
esac

DB_USER="postgres"
BACKUP_DIR="../../$SCRIPT_DIR/backups/$ENV"
RETENTION_DAYS=30

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting $ENV backup of database '$DB_NAME'..."

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$BACKUP_FILE"

FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "[$TIMESTAMP] Backup saved to $BACKUP_FILE ($FILE_SIZE)"

DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$TIMESTAMP] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "[$TIMESTAMP] Done."
