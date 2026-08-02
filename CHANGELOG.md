# Changelog

All notable changes to the **AgentForge WebUI** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
