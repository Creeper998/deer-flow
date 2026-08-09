"""Per-run policy registration for the Feishu channel."""

from __future__ import annotations

from app.channels.run_policy import CHANNEL_RUN_POLICY, ChannelRunPolicy


def register_policy() -> None:
    """Register Feishu's queueing and bounded batch-workflow headroom."""
    CHANNEL_RUN_POLICY["feishu"] = ChannelRunPolicy(
        default_recursion_limit=250,
        serialize_thread_runs=True,
    )


register_policy()
