#!/bin/sh
set -eu

alembic upgrade head

if [ "${MODE}" = "LOCAL" ] || [ "${MODE}" = "DEV" ]; then
  python -m src.cli seed-demo
fi

exec uvicorn src.main:app --host 0.0.0.0 --port 8000
