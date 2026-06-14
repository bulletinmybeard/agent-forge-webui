# Changelog

All notable changes to the **AgentForge WebUI** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
