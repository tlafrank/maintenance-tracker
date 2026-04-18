#!/usr/bin/env bash
set -euo pipefail

mkdir -p backups
backup_file="backups/maintenance-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"
echo "Backup written to $backup_file"
