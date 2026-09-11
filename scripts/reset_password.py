#!/usr/bin/env python3
"""Reset a local DeerFlow password through the active runtime.

The launcher prefers the running Docker Gateway because its network view and
mounted configuration match the live service. Without that container it falls
back to the host backend environment. The generated password remains owned by
``app.gateway.auth.reset_admin`` and is never printed by this wrapper.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
GATEWAY_CONTAINER = "deer-flow-gateway"
EMAIL_PATTERN = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)


def _gateway_container_running() -> bool:
    if shutil.which("docker") is None:
        return False
    result = subprocess.run(
        ["docker", "inspect", "--format={{.State.Running}}", GATEWAY_CONTAINER],
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


def _run_in_docker(email: str) -> int:
    result = subprocess.run(
        [
            "docker",
            "exec",
            "--env",
            f"DEER_FLOW_RESET_EMAIL={email}",
            GATEWAY_CONTAINER,
            "sh",
            "-lc",
            'cd /app/backend && uv run --no-sync python -m app.gateway.auth.reset_admin --email "$DEER_FLOW_RESET_EMAIL"',
        ],
        check=False,
    )
    return result.returncode


def _run_locally(email: str) -> int:
    uv = shutil.which("uv")
    if uv is None:
        print("Error: uv is required for a local password reset.", file=sys.stderr)
        return 1
    result = subprocess.run(
        [
            uv,
            "run",
            "--no-sync",
            "python",
            "-m",
            "app.gateway.auth.reset_admin",
            "--email",
            email,
        ],
        cwd=BACKEND_DIR,
        check=False,
    )
    return result.returncode


def reset_password(email: str, *, dry_run: bool = False) -> int:
    normalized_email = email.strip()
    if not EMAIL_PATTERN.fullmatch(normalized_email):
        print("Error: EMAIL must be a valid email address.", file=sys.stderr)
        return 2

    use_docker = _gateway_container_running()
    if dry_run:
        print(f"Password reset runtime: {'docker' if use_docker else 'local'}")
        return 0

    print(f"Resetting DeerFlow password through {'Docker Gateway' if use_docker else 'local backend'}...")
    exit_code = _run_in_docker(normalized_email) if use_docker else _run_locally(normalized_email)
    if exit_code == 0:
        print(f"Read the temporary credentials from: {BACKEND_DIR / '.deer-flow' / 'admin_initial_credentials.txt'}")
    return exit_code


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset a local DeerFlow account password")
    parser.add_argument("--email", default=os.environ.get("DEER_FLOW_RESET_EMAIL", ""))
    parser.add_argument("--dry-run", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    raise SystemExit(reset_password(args.email, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
