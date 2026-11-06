# Changelog

All notable changes to the **AgentForge WebUI** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.10.0] - 2026-11-06

### Added

- Account → Model instructions. A signed-in user edits the text sent with their prompts. A `Name:` line sets the first name on the home page. An empty field leaves that greeting without a name. The admin field is read-only and shows `user_context.md`. Saving does not change that file. While logged in as another user, the field is that user's text
- **Debug** in the header, after Services, while a chat is open. Amber. Opens `agentforgedebug://<session-id>` in AgentForge Debug. The id is the host. No session, no link
- `node src/lib/debugSession.test.js` covers which ids become that URL
- A fenced code block in the composer is its own field. The ``` markers stay out of that field, and the language sits above it. Backspace in an empty fence removes it. Arrow keys move between the prose and the fence. The stored prompt is still one string. Inline code in the prose stays highlighted
- A sent prompt uses the same split: inline code, fenced blocks, and the rest as text. A long prompt is clamped until **Show more**
- `node src/lib/promptBlocks.test.js` covers fence parsing and the round trip back into the stored string

### Fixed

- A chat URL that does not open returns to `/` and shows "This chat isn't available." The notice goes away after 10 seconds, or when dismissed. It does not say why. `node src/lib/chatNotice.test.js` covers that text and the timer
- Restored messages read an offset-less `created_at` as UTC before the poller checks that a finished follow-up belongs to this send. A browser on CET was treating the container clock as local, so the status line stayed on "Agent is working..." after the answer was already stored
- `node src/lib/polledTurn.test.js` covers an offset-less timestamp read as UTC

## [0.9.0] - 2026-11-05

Needs [AgentForge](https://github.com/bulletinmybeard/agent-forge) **[v0.18.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.18.0)**. The sign-in name is `AGENTFORGE_ADMIN_USERNAME` on the API (default `admin`). The password is `AGENTFORGE_ADMIN_PASSWORD`. There is no email.

### Added

- Login wall. On load, `GET /api/auth/me`. A 401 shows the sign-in page. When the API reports `auth_required: false`, the wall stays down
- Account at `/settings/account`: who is signed in, log out, create and revoke API keys. The secret is shown once
- Users at `/settings/users`, shown to an admin only. List, create, and edit open in a modal. Delete asks for confirmation. The deployment admin row is listed and cannot be edited or deleted from here
- **Login** on another user's row, before Edit and Delete. Confirmation, then the session becomes that user and the app loads `/`
- A banner on every page while that session is active: who is signed in, and **Return to** the admin username. Account **Log out** still ends the session and does not return to the admin
- `node src/lib/auth.test.js` covers which 401 responses send the UI back to the login page

### Changed

- A 401 from a later API call, other than the login POST, returns to the sign-in page

## [0.8.0] - 2026-11-05

### Added

- Settings at `/settings`, opened from the gear to the right of the API status dot. Replaces the chat and hides the session list. Left nav, first section Appearance
- Theme dropdown under Appearance > Theme. Themes taken from agent-forge-email: Dark Forge, Dark Forge bw, Dark Forge Orange, Dark Forge Orange v2. Choice stored in `localStorage` as `agentforge:theme` (default `dark-forge`)
- Add a theme by copying `src/themes/dark-forge` and registering it in `src/themes/index.js`
- `node src/themes/registry.test.js` covers theme id resolution
- The status line names the in-flight model call (`Calling <model> · N messages`, or `for the final answer`), plus routing, pipeline steps, parallel groups, and review specialists. The config card shows the model
- Cards for review progress, the coding plan, the parallel plan, and a refined opening prompt. Coding plans, parallel plans, and model-fallback hops restore after reload
- Prompt queue. The composer stays enabled while a turn is running. Submit snapshots the prompt (text, attachments, mode prefix, profile overrides, incognito, provider) and sends it after the turn goes idle. Each queued row can be dropped, or run now, which cancels the current turn and starts that prompt immediately. Stop cancels the run and clears the queue. Switching sessions clears it. Run now's cancel card is ordered by the matching [AgentForge](https://github.com/bulletinmybeard/agent-forge) Unreleased tree; the queue itself works against **[≥ 0.17.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.17.0)**
- `node src/lib/promptQueue.test.js` covers the queue operations (append, drop, take one, shift head)

### Changed

- Gray surfaces and the indigo accent follow the active theme. Status colors (connected dot, errors, warnings) stay put

## [0.7.0] - 2026-10-24

Needs [AgentForge](https://github.com/bulletinmybeard/agent-forge) **[≥ 0.17.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.17.0)** for `@film` / `@movie` / `@movies`: TMDB lookup, the local `film_db` library, and recommend-similar.

### Added

- Mode chip **Film** (`@film`, `@movie`, `@movies`) for TMDB lookup, local library, and recommend
- Mode picker popover: search across ids, aliases, labels, group names, and descriptions with a subsequence fallback, grouped sections, arrow/Enter navigation, and a recent-modes list in `localStorage`
- Custom agents from `/api/agents` show up as picker rows, skipping any `@alias` a built-in mode already owns
- Inline code highlighting in the composer: a `` `backticked` `` span renders boxed while the ticks stay in the stored prompt, so the caret keeps lining up
- Per-session mode memory: an existing chat reopens in the mode its transcript ran, a new chat starts at `chat`, and an unsent prompt keeps the mode it was drafted with
- Test scripts for the picker, inline code, session mode, polled turns, summary tools, and custom modes — run one with `node src/lib/<name>.test.js`

### Changed

- Move custom-agent row derivation out of `useModes` into `src/lib/customModes.js`, and the picker UI out of `ChatInput` into `ModeSelector`
- Title the run-complete browser notification **AgentForge** and move the notification preference to `agentforge:notifications` (notifications need enabling once more)

### Fixed

- A chat whose WebSocket dropped `agent.result` sat on the spinner until reload. The running-state poll now adopts the finished turn from SQLite instead of keeping only confirms and file diffs
- Run-footer tool histogram walked characters when an older `@review` / `@research` summary stored its tool list as a comma-separated string
- The service drawer's self-restart guard matched a container name no deployment uses, so the dashboard offered to restart the container serving it

## [0.6.0] - 2026-09-13

Needs [AgentForge](https://github.com/bulletinmybeard/agent-forge) **[≥ 0.16.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.16.0)** for `@plan` / `@build`, plan-gate confirms (`kind=plan`), `file.diff` write receipts, and `run.idle` after worker jobs.

### Added

- Mode chips and cards for `@plan` / `@build`: plan document, build recap, markdown toggle
- Plan confirm: Approve / Keep drafting (no This session on that gate)
- `file.diff` receipts (`written` / `edited`) replace the pending proposed card
- Build undo card (`# Build reverted`) and `run.idle` so processing clears after a fast worker job

### Changed

- Confirm dialog: timeout, This time / This session
- File-diff states (proposed, written, reverted)
- Markdown / result rendering
- Dockerfile: Rolldown musl binding after `npm ci`

### Fixed

- Plan/build markdown toggle empty (`MarkdownContent` children)
- Processing spinner stuck after `@build undo`

## [0.5.0] - 2026-08-23

Needs the matching [AgentForge](https://github.com/bulletinmybeard/agent-forge) **Unreleased** tree for `/trips` maps, session `overrides.profiles`, and `GET /api/memory/schemas` `schema_tool_available`. Recap still needs AgentForge **≥ 0.14.0**.

### Added

- Reverse-proxy **`/trips`** (nginx + Vite) so `@trip` map links stay same-origin with chat (`/ws`, `/api`, `/uploads`)
- Shared `MarkdownContent`: GFM, HTML-tag protection in prose, syntax highlighting via highlight.js (language from the fence info string / no auto-detect)
- Copy button on the tool-calls panel

### Changed

- Mode picker and profile overrides are **per-session** (localStorage keyed by session ID). New chats no longer inherit the previous chat's mode or overrides
- Retry last prompt forwards the current profile overrides and incognito flag
- Profile modal loads `/api/profiles?include_abstract=true` so cloud tier models show in the dropdown
- Memory Settings: schema load failures stay on the Schemas tab > banner when `sql_schema_tool` is missing > scan/clear disabled then

### Fixed

- Memory modal Facts/Memories error banner when `/api/memory/schemas` 503'd (private SQL plugin absent)
- Bare fences mislabeled as random languages (e.g., vbnet)

## [0.4.0] - 2026-08-02

Requires [AgentForge](https://github.com/bulletinmybeard/agent-forge) **[≥ 0.14.0](https://github.com/bulletinmybeard/agent-forge/releases/tag/v0.14.0)** for the recap endpoint (`POST /api/sessions/{id}/recap`).

### Added

- **Recap**: idle-triggered running summary under the last answer (`useRecap` + `RecapMessage`). After `RECAP_MESSAGE_THRESHOLD` complete user/assistant exchanges since the last recap (default **3**), waits `RECAP_IDLE_MS` of quiet (default **1 min**), then `POST`s the recap endpoint. Backend stores a volatile recap message so it survives reloads; plain text only (no Markdown)

## [0.3.0] - 2026-07-19

Requires [AgentForge](https://github.com/bulletinmybeard/agent-forge) **≥ 0.13.0** for command permission profiles (`/api/permissions/profiles/*`). Command-permissions overrides (`/api/permissions/commands/*`) remain as in 0.12.

### Added

- **Command permission profiles** in the Command Permissions modal: list/apply YAML baseline, blank slate, builtin (`tight` / `open`) and user-saved profiles; save current policy as a named profile; delete user profiles (`useCommandPermissions` + `/api/permissions/profiles`)

### Fixed

- Pattern/command list textareas: Enter no longer collapses multi-line editing (draft lines keep trailing empty rows; blanks are stripped only on save/compare/validate)

## [0.2.0] - 2026-07-18

Requires [AgentForge](https://github.com/bulletinmybeard/agent-forge) **≥ 0.12.0** for the command-permissions API (`/api/permissions/commands/*`).

### Added

- **Command Permissions** modal: manage shell/SSH policy (confirm / allowlist / denylist), pattern lists, dry-run command validate against draft form values, save/reset runtime overrides (global, all sessions)
- Entry in the chat input menu tabs **Shell · local** / **SSH · remote** with context copy for each tool
- `engines.node` ≥ 20.19.0 for Vite 8 / modern tooling
- Better offline handling: disable prompt controls while AgentForge is unreachable and re-enable and refresh sessions on reconnect
- Session list filtered by `source=web` so external clients stay out of the Agent Chat sidebar

### Changed

- Biome config for CLI 2.5.x (`preset`, schema, Tailwind CSS parser directives)
- Node dependency updates and VS Code workspace tooling checked in

## [0.1.0] - 2026-06-14

First release of the React SPA for [AgentForge](https://github.com/bulletinmybeard/agent-forge).

### Added

- React 19 + Vite 8 SPA that drives the AgentForge backend over the `/ws/chat` WebSocket and its REST API
- Streaming chat rendering the full think -> act -> observe event stream live
- Mode picker for the `@mode` prefixes (chat, docs, search, agent, sql, logs, discover, pipeline, review, research, coding, scheduler, monitor, connectors, custom agents), each with its own colour, with linked connections grouped under a Connections section
- Per-event message cards: routing, config, tool calls, confirm + secret dialogs, results, summaries, errors, search metadata, discovery, research, scheduler/monitor jobs, file diffs, agent warning/recovery/retry/escalation, model fallback, and session compaction
- Connectors UI: connect and manage multi-account Google (Gmail, Drive, BigQuery, YouTube), GitLab, and GitHub connections, with per-connection product/permission display and an in-place read/write toggle
- Canvas workspace for pinned snippets, results, and queries
- Bookmarks modal: save tool-call sets and agent answers from any run, fuzzy-searchable, with a mixed list and type badges
- Botty side panel for passive, in-context suggestions
- Session sidebar, status bar, knowledge bar, memory settings, profile and provider selectors, a help modal, and a not-found (404) page
- Context-usage bar with one-click session compaction at the critical threshold
- Eager file uploads: paperclip, clipboard paste, or drag-and-drop with inline thumbnails. Unset attachments persist across reloads
- GitHub-flavoured Markdown rendering and a Monaco-based inline prompt editor
- Vite dev server with a hardened WebSocket/HTTP proxy to the backend, plus a Docker (nginx + Traefik) deploy
