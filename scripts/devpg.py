"""
Local development PostgreSQL launcher for MadrNext.

Uses the pgserver Python package (bundled PostgreSQL 17 binaries) so the
sandbox can run a real Postgres without system packages.

Usage:  python3 scripts/devpg.py          (blocks while the server runs)
"""
import os
import sys
import time

import pgserver

PGDATA = os.environ.get("MADRNEXT_PGDATA", "/home/user/.madrnext-pg")
URI_FILE = os.environ.get("MADRNEXT_PGURI_FILE", "/home/user/.madrnext-pg/uri.txt")


def main() -> None:
    os.makedirs(PGDATA, exist_ok=True)
    server = pgserver.get_server(
        PGDATA,
        cleanup_mode=None,  # keep data between restarts
    )
    uri = server.get_uri()
    with open(URI_FILE, "w") as f:
        f.write(uri)
    print("PostgreSQL ready:", uri, flush=True)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
