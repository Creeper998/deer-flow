from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType


def _load_launcher() -> ModuleType:
    path = Path(__file__).resolve().parents[2] / "scripts" / "reset_password.py"
    spec = importlib.util.spec_from_file_location("reset_password_launcher", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_rejects_invalid_email_before_selecting_runtime(monkeypatch):
    launcher = _load_launcher()
    selected = False

    def unexpected_runtime_check() -> bool:
        nonlocal selected
        selected = True
        return False

    monkeypatch.setattr(launcher, "_gateway_container_running", unexpected_runtime_check)

    assert launcher.reset_password("admin@example.com; touch /tmp/pwned") == 2
    assert selected is False


def test_dry_run_prefers_running_gateway(monkeypatch, capsys):
    launcher = _load_launcher()
    monkeypatch.setattr(launcher, "_gateway_container_running", lambda: True)

    assert launcher.reset_password("admin@example.com", dry_run=True) == 0
    assert "Password reset runtime: docker" in capsys.readouterr().out


def test_local_reset_passes_email_as_one_argv_value(monkeypatch):
    launcher = _load_launcher()
    seen: list[str] = []
    monkeypatch.setattr(launcher.shutil, "which", lambda name: "/usr/bin/uv" if name == "uv" else None)

    class Result:
        returncode = 0

    def fake_run(command, **_kwargs):
        seen.extend(command)
        return Result()

    monkeypatch.setattr(launcher.subprocess, "run", fake_run)

    assert launcher._run_locally("admin@example.com") == 0
    assert seen[-2:] == ["--email", "admin@example.com"]
