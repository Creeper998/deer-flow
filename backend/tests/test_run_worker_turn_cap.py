"""Lead-run recovery when LangGraph's recursion safety ceiling is reached."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langgraph.errors import GraphRecursionError

from deerflow.runtime.runs.manager import RunManager
from deerflow.runtime.runs.schemas import RunStatus
from deerflow.runtime.runs.worker import TURN_CAP_ERROR_MESSAGE, TURN_CAP_STOP_REASON, RunContext, run_agent


def _make_bridge():
    return SimpleNamespace(publish=AsyncMock(), publish_end=AsyncMock(), cleanup=AsyncMock())


@pytest.mark.anyio
async def test_lead_graph_recursion_error_surfaces_turn_cap_and_actionable_event():
    run_manager = RunManager()
    record = await run_manager.create("thread-turn-cap")
    bridge = _make_bridge()

    class CappedAgent:
        async def astream(self, graph_input, config=None, stream_mode=None, subgraphs=False):
            raise GraphRecursionError("Recursion limit of 100 reached")
            yield  # pragma: no cover - keep this an async generator

    await run_agent(
        bridge,
        run_manager,
        record,
        ctx=RunContext(checkpointer=None),
        agent_factory=lambda *, config: CappedAgent(),
        graph_input={},
        config={},
    )

    fetched = await run_manager.get(record.run_id)
    assert fetched.status == RunStatus.error
    assert fetched.stop_reason == TURN_CAP_STOP_REASON
    assert fetched.error == TURN_CAP_ERROR_MESSAGE
    bridge.publish.assert_any_await(
        record.run_id,
        "error",
        {
            "message": TURN_CAP_ERROR_MESSAGE,
            "name": "GraphRecursionError",
            "stop_reason": TURN_CAP_STOP_REASON,
        },
    )
    bridge.publish_end.assert_awaited_once_with(record.run_id)
