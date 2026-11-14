# AgentForge WebUI

[![CI](https://github.com/bulletinmybeard/agent-forge-webui/actions/workflows/ci.yml/badge.svg)](https://github.com/bulletinmybeard/agent-forge-webui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Biome](https://img.shields.io/badge/lint%2Fformat-Biome-60a5fa.svg?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Requires AgentForge](https://img.shields.io/badge/requires-AgentForge%200.18.0%2B-blueviolet)](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.18.0)
[![Code review: Claude Opus 5](https://img.shields.io/badge/code%20review-Claude%20Opus%205-D97757?logo=claude&logoColor=white)](#pre-release-code-review)

> [!NOTE]
> **Experimental!**
> AgentForge WebUI is the front-end I tinker with to see how AgentForge feels as a full chat app: every mode, the tools, connectors, and the live think-act-observe stream in one place. It is early, lightly tested, and rough in the corners I haven't needed yet.

AgentForge WebUI is a React SPA for [AgentForge](https://github.com/bulletinmybeard/agent-forge).

It's a pure frontend: it streams the agent's think > act > observe loop over the backend's `/ws/chat` WebSocket and calls its REST API for sessions, uploads, memory, and configs. It does nothing on its own — a running AgentForge backend is required!

> [!IMPORTANT]
> **Backend version:** WebUI **0.10.0** needs [AgentForge **v0.20.0**](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.20.0). The sign-in name is `AGENTFORGE_ADMIN_USERNAME` (default `admin`). The password is `AGENTFORGE_ADMIN_PASSWORD`. There is no email. **Login** as another user uses `POST /api/auth/impersonate`. A 401 from `GET /api/auth/me`, or from a later call other than the login POST, shows the sign-in page. `auth_required: false` leaves the wall down.
> **Prompt queue and live progress:** basic prompt queueing works with AgentForge **[≥ v0.17.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.17.0)**. Correct **Run now** cancellation-card ordering and the model-aware agent, pipeline, parallel-group, and review progress—including persisted model-fallback hops—shipped in **[v0.18.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.18.0)**.
> **Revised shell command:** the Tools card updates when `tool.call.revised` arrives. That event shipped in **[v0.20.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.20.0)**. An older server never sends it, so the card keeps the command the model sent.

## Features

- Streaming chat over the `/ws/chat` WebSocket, with the full think > act > observe event stream rendered live. The status line names the model call in flight, the current tool, and the quiet stages (routing, planning, synthesis, review specialists, parallel groups)
- Prompt queue: the composer stays enabled during a run. A submit waits and runs after the current turn finishes. Each queued prompt can be removed, or run now (stop the current turn and start that one). Stop still cancels the run and drops the queue
- Mode picker for the `@mode` prefixes (chat, docs, search, agent, sql, logs, discover, pipeline, review, research, coding, plan, build, film, scheduler, monitor, connectors, and custom agents including `@trip`), each with its own colour. Mode and profile overrides are per-session; new chats start clean
- Per-event message cards: routing, config (including the model), tool calls (a `shell` row updates when `tool.call.revised` names the command that ran; needs AgentForge 0.20.0), confirm + secret dialogs, results, summaries, errors, search metadata, discovery, research, scheduler/monitor jobs, file diffs, agent warning/recovery/retry/escalation, model fallback, review progress, coding plan, parallel plan, refined prompt, and session compaction
- **Command Permissions** modal: manage shell/SSH allowlist, denylist, and confirm policy (runtime overrides on the AgentForge backend), plus named **profiles** (YAML baseline, blank slate, builtins `tight`/`open`, save-as / delete user profiles)
- Connectors UI: connect and manage multi-account Google (Gmail, Drive, BigQuery, YouTube), GitLab, and GitHub connections, with per-connection product/permission display and an in-place read/write toggle
- Canvas workspace for pinned snippets, results, and queries
- Bookmarks: save tool-call sets and agent answers from any run, fuzzy-searchable in a modal
- Botty side panel for passive, in-context suggestions and full semantic-searchable chat session history
- Session sidebar, status bar, knowledge bar, memory settings, profile and provider selectors, and a help modal
- Settings at `/settings` (gear, right of the API status dot). Appearance picks the theme: Dark Forge, Dark Forge bw, Dark Forge Orange, Dark Forge Orange v2, saved in this browser. The session list is hidden while Settings is open
- Context-usage bar with one-click session compaction at the critical threshold
- **Recap**: idle-triggered running summary of the conversation in a muted block under the last answer, persisted so it survives reloads
- Eager file uploads: paperclip, clipboard paste, or drag-and-drop with inline thumbnails. Unset attachments persist across reloads
- GitHub-flavoured Markdown rendering with fenced-code highlighting, and a Monaco-based inline prompt editor
- Same-origin proxy for `@trip` maps (`/trips`) alongside `/ws`, `/api`, and `/uploads`

## User accounts

Sign-in, users, and API keys are AgentForge features. This app only calls them. The WebUI does not store passwords or keys.

The deployment admin signs in with `AGENTFORGE_ADMIN_USERNAME` and `AGENTFORGE_ADMIN_PASSWORD` from the AgentForge environment. There is no email. An empty username stays `admin`. Scripts, the macOS app, and browser extensions use `security.api_keys` in AgentForge `config.yaml`. Those keys are the admin user. They are not the WebUI password, and signing in here does not create one. A key created under Settings > Account belongs to the signed-in user. AgentForge stores the hash and shows the secret once.

With the admin password set, nothing in the app loads until `GET /api/auth/me` succeeds. A 401 is the sign-in page. `auth_required: false` leaves the wall down, which is a local AgentForge install with no script keys and no admin password.

An admin can do this in the WebUI:
- Settings > Account shows the signed-in name, logs out, creates or revokes API keys, and holds model instructions
- Settings > Users lists people, creates a user, edits a name or password, and deletes a user. The admin row is listed and cannot be edited or deleted here. Delete removes that user's chats and the rest of their WebUI data on the AgentForge side
- **Login** on another user's row asks for confirmation, then opens AgentForge as that user. Chats, linked accounts, cached DB schemas, and model instructions are theirs. A banner at the top names the user and returns to the admin session. **Log out** ends the session instead of returning. Login is not on the admin row, and it is not available while the banner is up

Anyone else signs in with the username and password an admin set. They do not see Users.

Model instructions are per person. The admin text is `user_context.md` on the AgentForge server (`user_context` in `config.yaml`). Account shows that text and does not save over the file. Anyone else edits their own text on Account. A `Name:` line sets the first name on the home page. An empty field leaves the greeting without a name.

## Getting started

Prerequisites:
- **Node 20.19+** (`engines` in `package.json`)
- A running [AgentForge](https://github.com/bulletinmybeard/agent-forge) backend **[v0.18.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.18.0) or newer** (`scripts/deploy-local.sh` brings the stack up with the web service on `:8200`)

```bash
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

The dev server proxies `/ws`, `/api`, `/uploads`, and `/trips` to the backend. The target defaults to `http://localhost:8200`; override it with `VITE_BACKEND_URL`:

```bash
VITE_BACKEND_URL=https://agent.remote npm run dev
```

## Build

```bash
npm run build    # production build to dist/
npm run preview  # serve the build locally
```

## Run with Docker

`scripts/deploy-web-local.sh` builds the SPA and runs it on this host as a standalone nginx container (`Dockerfile` + `docker-compose.web.local.yml`). It serves the static bundle and reverse-proxies `/ws`, `/api`, `/uploads`, and `/trips` to your AgentForge backend — nothing leaves the machine.

```bash
scripts/deploy-web-local.sh    # build + run, detached, on http://localhost:8400
scripts/teardown-web-local.sh  # stop and remove it
```

It expects an AgentForge backend reachable at `http://host.docker.internal:8200` (the default from the backend's `scripts/deploy-local.sh`).

Flags:
- `--dev` (alias `--hot`): skip the container and run the Vite dev server with hot reload on the same port, proxying `/ws` `/api` `/uploads` `/trips` to the backend. The fast inner loop: no image, no rebuilds, instant reloads on save
- `--no-build`: recreate the container without rebuilding the image
- `--no-cache`: force a clean image build (no Docker layer cache)
- `--foreground`: run attached and stream logs instead of detaching

Defaults come from `deploy-web.local.env` (optional: copy `deploy-web.local.env.example`): `WEB_PORT` (default `8400`) and `AGENT_BACKEND` (default `http://host.docker.internal:8200`).

## Pre-release code review

The changes for the current unreleased version were reviewed by **Claude Opus 5** (Anthropic), run through [Claude Code](https://claude.com/claude-code), on 2026-10-24.

Scope was the diff for that release, not the whole codebase: dead code, the new picker and composer surfaces, lint and format conformance, the standalone test scripts, and whether the README and CHANGELOG matched what shipped. What came out of it is in the [CHANGELOG](CHANGELOG.md).

This is one review pass by one model on one diff, not an audit or a security guarantee — see the note at the top of this README about what AgentForge WebUI is. Findings were verified and fixed by hand before release.

## License

MIT, see [LICENSE](LICENSE).
