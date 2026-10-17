# 06 — Job State Machine

The brief requires a documented job state machine. This is the proposed definition.

## States

| State | Meaning | Terminal |
|-------|---------|----------|
| `uploading` | Upload in progress (optional, client-visible) | No |
| `queued` | Job persisted and enqueued | No |
| `processing` | Worker is probing or converting | No |
| `completed` | MP3 produced and verified | Yes* |
| `failed` | Conversion failed with an error code | Yes* |
| `cancelled` | Cancelled by the user or admin | Yes* |
| `expired` | Retention elapsed; files removed | Yes |

*Retry can move `failed` and `cancelled` jobs back to `queued`.

## Transitions

| From | To | Trigger |
|------|----|---------|
| (none) | `queued` | Job created |
| `queued` | `processing` | Worker picks up job |
| `queued` | `cancelled` | User cancels before start |
| `processing` | `completed` | Output verified |
| `processing` | `failed` | Error, timeout, or crash recovery exhausted |
| `processing` | `cancelled` | Cancellation honored by worker |
| `failed` | `queued` | Retry (input still retained) |
| `cancelled` | `queued` | Retry (input still retained) |
| `completed` | `expired` | Retention cleanup |
| `failed` / `cancelled` | `expired` | Retention cleanup |

Any transition not in this table is rejected with `INVALID_STATE`.

```
queued ──► processing ──► completed ──► expired
  │            │  └──► failed ──┐          ▲
  │            └─────► cancelled│          │
  └──► cancelled ◄──────────────┘          │
        failed/cancelled ──retry──► queued │
        failed/cancelled ──────────────────┘
```

## Rules
- Transitions are applied through one service with an atomic conditional update (`findOneAndUpdate` filtered by the expected current state), so two actors cannot both win.
- Retry requires the input file still exists; otherwise the job reports `expired`.
- Each retry increments `attempt`; a maximum attempt count is enforced.
- Cancellation sets `cancelRequestedAt`; the worker checks it and kills the process.
- A job stuck in `processing` beyond timeout plus grace is recovered by a watchdog and failed or re-queued.
- Every transition writes an audit entry.
