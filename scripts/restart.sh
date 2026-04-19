#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$REPO_ROOT/scripts"


sudo echo "Restarting Maintenance Tracker"
cd "$REPO_ROOT"
git pull
sudo "$SCRIPTS_DIR/dev-down.sh"
sudo "$SCRIPTS_DIR/dev-up.sh"
