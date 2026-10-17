# 03 — Media Processing

## Tools
- **FFprobe** inspects uploaded files and verifies generated outputs.
- **FFmpeg** extracts the audio and encodes it as MP3.

## Encoding settings
- Default bitrate: **192 kbps**
- Allowed: **96, 128, 192, 256, 320 kbps** (validated against an allowlist)

## Enforced limits
The following must all be enforced, with values configurable (see Configuration):
- Upload size
- Media duration
- Process timeout
- CPU
- Memory
- Disk
- Concurrency

## Safe invocation rules
- Spawn FFmpeg/FFprobe with an **argument array**, never a shell string. No `shell: true`.
- Build arguments from validated, typed values only (bitrate from the allowlist, trim times as numbers).
- **No** arbitrary FFmpeg flags, filesystem paths or remote URLs from the browser.
- Input and output paths are generated server-side inside the job's working directory.
- Pin a protocol allowlist (for example `-protocol_whitelist file`) so a crafted container cannot cause network or local file reads. (Proposed)

## Pipeline (Proposed)
1. **Pre-probe:** FFprobe the input as JSON. Confirm container is MP4/MOV-family, at least one audio stream exists, duration is within limits, and the codec is supported.
2. **Convert:** Extract the audio stream, drop video, encode with `libmp3lame` at the chosen bitrate, applying trim if requested. Parse progress from FFmpeg's machine-readable progress output.
3. **Post-probe:** FFprobe the output. Confirm codec is MP3, duration is within a small tolerance of the expected value, and size is non-zero.
4. **Finalize:** Move output into storage, record metadata, mark completed, delete the input if no longer needed.

## Failure handling
Each of these must end in a safe, user-readable failure state with a stable error code and no leaked internals:
- Corrupted media
- Missing audio stream
- Unsupported codec
- Cancellation (kill the process, clean partial files)
- Timeout (kill the process tree, clean partial files)
- Worker crash or restart (job recovered or failed, never stuck in `processing`)

## Resource containment (Proposed)
- Run FFmpeg with a wall-clock timeout and kill the process group on expiry.
- Limit threads per FFmpeg process.
- Apply container CPU and memory limits to the worker.
- Use a per-job temp directory that is always removed in a `finally` path.
