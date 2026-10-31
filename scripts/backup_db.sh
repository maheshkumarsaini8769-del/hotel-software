#!/usr/bin/env bash
# ==============================================================================
# SpiceHub Production Automated MongoDB Backup & Rotation Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/spicehub}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/spicehub_dev?replicaSet=rs0}"
DB_NAME="${DB_NAME:-spicehub_dev}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/spicehub_backup_${TIMESTAMP}.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated backup for database: ${DB_NAME}..." | tee -a "${LOG_FILE}"

if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="${MONGO_URI}" --gzip --archive="${BACKUP_FILE}"
elif docker ps --format '{{.Names}}' | grep -q "spicehub_mongodb"; then
  echo "Using docker container spicehub_mongodb for mongodump..." | tee -a "${LOG_FILE}"
  docker exec spicehub_mongodb mongodump --db="${DB_NAME}" --gzip --archive > "${BACKUP_FILE}"
else
  echo "ERROR: Neither mongodump nor running docker container spicehub_mongodb was found!" | tee -a "${LOG_FILE}"
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup successful! Archive: ${BACKUP_FILE} (${FILE_SIZE})" | tee -a "${LOG_FILE}"

# Retain only the last N days of backups
echo "Pruning backups older than ${RETENTION_DAYS} days..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -name "spicehub_backup_*.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup & rotation cycle completed successfully." | tee -a "${LOG_FILE}"
