import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { v7 as uuidv7 } from "uuid";
import ws from "../lib/ws";

export const useAgent = () => {
  const { sessionId: urlSessionId } = useParams();

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [secret, setSecret] = useState(null);
  const [sessionInfo, setSessionInfo] = useState({});
  const [sessionTitle, setSessionTitle] = useState("");
  const [_historyLoaded, setHistoryLoaded] = useState(false);
  const [contextUsage, setContextUsage] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [incognito, setIncognito] = useState(false);
  const toggleIncognito = useCallback(() => setIncognito((v) => !v), []);
  const [noHistory, setNoHistory] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("scout_notifications") === "on" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted",
  );

  const notificationsRef = useRef(notificationsEnabled);
  useEffect(() => {
    notificationsRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const toggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem("scout_notifications", "off");
      return;
    }
    if (typeof Notification === "undefined") return;
    const perm =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") {
      setNotificationsEnabled(true);
      localStorage.setItem("scout_notifications", "on");
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    const sync = () => {
      if (!ws.isConnected()) {
        ws.connect({ sessionId: urlSessionId || undefined });
      }
      setConnected(ws.isConnected());
    };
    sync();
    const id = setInterval(sync, 3000);
    return () => clearInterval(id);
  }, [urlSessionId]);

  const [presets, setPresets] = useState([]);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then(setPresets)
      .catch(() => setPresets([]));
  }, []);

  const [uploadLimits, setUploadLimits] = useState({
    max_file_size_bytes: 75 * 1024 * 1024,
    max_file_size_mb: 75,
    max_files_per_request: 25,
  });

  useEffect(() => {
    fetch("/api/upload-limits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUploadLimits(data);
      })
      .catch(() => {});
  }, []);

  const [availableSkills, setAvailableSkills] = useState([]);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => (r.ok ? r.json() : { skills: [] }))
      .then((data) => setAvailableSkills(data.skills || []))
      .catch(() => setAvailableSkills([]));
  }, []);

  const [providers, setProviders] = useState(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProviders(data);
      })
      .catch(() => setProviders(null));
  }, []);

  const [selectedProvider, setSelectedProvider] = useState("default");

  const [commandNotes, setCommandNotes] = useState(new Map());

  const sessionIdRef = useRef(urlSessionId || null);
  const runningRef = useRef(false);
  const historyReadyRef = useRef(false);
  const toolBufferRef = useRef([]);
  const liveToolCallsTsRef = useRef(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestSequenceRef = useRef(null);
  const liveResultTsRef = useRef(null);
  const discoveryAreasRef = useRef({});
  const researchAgentsRef = useRef({});
  const setRunningTracked = useCallback((val) => {
    const v = typeof val === "function" ? val(runningRef.current) : val;
    runningRef.current = v;
    setRunning(v);
  }, []);
  const msgSeqRef = useRef(0);
  const retrySnapshotRef = useRef(null);

  const addMessage = useCallback((msg) => {
    const seq = ++msgSeqRef.current;
    setMessages((prev) => [...prev, { ...msg, _ts: `${Date.now()}-${seq}` }]);
  }, []);

  const loadMoreMessages = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || !hasMoreMessages || loadingMore) return;
    const before = oldestSequenceRef.current;
    if (!before) return;

    setLoadingMore(true);
    try {
      const res = await fetch(`/api/sessions/${sid}/messages?limit=50&before=${before}`);
      if (!res.ok) return;
      const pageData = await res.json();
      const olderMsgs = pageData.messages || [];
      if (olderMsgs.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      const restored = restoreMessages(olderMsgs);
      setMessages((prev) => [...restored, ...prev]);
      setHasMoreMessages(pageData.has_more ?? false);
      oldestSequenceRef.current = pageData.oldest_sequence ?? 0;
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreMessages, loadingMore]);

  useEffect(() => {
    if (!urlSessionId) {
      setMessages([]);
      setSessionTitle("");
      setCommandNotes(new Map());
      runningRef.current = false;
      setRunning(false);
      setIncognito(false);
      setNoHistory(false);
      historyReadyRef.current = true;
      setHistoryLoaded(true);
      sessionIdRef.current = null;
      return;
    }

    historyReadyRef.current = false;
    sessionIdRef.current = urlSessionId;
    setHistoryLoaded(false);

    runningRef.current = false;
    setRunning(false);
    setIncognito(false);

    const anchorMatch = window.location.hash.match(/^#msg-(\d+)/);
    const anchorEpoch = anchorMatch ? parseInt(anchorMatch[1], 10) : null;
    const messagesUrl = anchorEpoch
      ? `/api/sessions/${urlSessionId}/messages/around?ts=${anchorEpoch}&window=25`
      : `/api/sessions/${urlSessionId}/messages?limit=50`;

    Promise.all([
      fetch(`/api/sessions/${urlSessionId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(messagesUrl).then((r) =>
        r.ok ? r.json() : { messages: [], has_more: false, oldest_sequence: 0 },
      ),
      fetch(`/api/commands/session/${urlSessionId}`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([session, pageData, notes]) => {
      if (session) {
        setSessionTitle(session.title || "");
        setSessionInfo((prev) => ({
          ...prev,
          sessionId: urlSessionId,
          canvas_enabled: session.canvas_enabled ?? prev.canvas_enabled,
        }));
      }

      const notesMap = new Map();
      for (const note of notes) {
        if (note.message_ts) {
          notesMap.set(note.message_ts, { note_id: note.id, title: note.title });
        }
      }
      setCommandNotes(notesMap);

      const dbMessages = pageData.messages || pageData; // backwards compat with flat array
      const hasMore = pageData.has_more_before ?? pageData.has_more ?? false;
      const oldestSeq = pageData.oldest_sequence ?? 0;

      const restored = restoreMessages(dbMessages);
      setMessages(restored);
      setHasMoreMessages(hasMore);
      oldestSequenceRef.current = oldestSeq;

      const lastConfig = [...restored].reverse().find((m) => m.type === "config");
      if (lastConfig?.noHistory) {
        setNoHistory(true);
        setIncognito(true);
      }

      historyReadyRef.current = true;
      setHistoryLoaded(true);
    });
  }, [urlSessionId]);

  useEffect(() => {
    if (!historyReadyRef.current) return;

    const flushTools = () => {
      if (liveToolCallsTsRef.current !== null) {
        const liveTs = liveToolCallsTsRef.current;
        setMessages((prev) => prev.map((m) => (m._ts === liveTs ? { ...m, _live: false } : m)));
        return;
      }
      if (toolBufferRef.current.length > 0) {
        const calls = [...toolBufferRef.current];
        toolBufferRef.current = [];
        addMessage({ type: "tool_calls", calls });
      }
    };

    const finalizeTools = () => {
      if (liveToolCallsTsRef.current !== null) {
        const liveTs = liveToolCallsTsRef.current;
        liveToolCallsTsRef.current = null;
        toolBufferRef.current = [];
        setMessages((prev) => prev.map((m) => (m._ts === liveTs ? { ...m, _live: false } : m)));
        return;
      }
      if (toolBufferRef.current.length > 0) {
        const calls = [...toolBufferRef.current];
        toolBufferRef.current = [];
        addMessage({ type: "tool_calls", calls });
      }
    };

    const onConnected = () => {
      setConnected(true);

      const sid = sessionIdRef.current;
      if (!sid) return;

      if (runningRef.current) {
        fetch(`/api/sessions/${sid}/messages`)
          .then((r) => (r.ok ? r.json() : []))
          .then((dbMsgs) => {
            if (!dbMsgs.length) return;
            const lastType = dbMsgs[dbMsgs.length - 1]?.type;
            const runDone =
              lastType === "result" ||
              lastType === "error" ||
              lastType === "summary" ||
              lastType === "cancelled";
            const recovered = restoreMessages(dbMsgs);
            setMessages((currentMsgs) => {
              if (currentMsgs.length > 0 && !runDone) {
                return currentMsgs;
              }
              return recovered;
            });
            if (runDone) {
              setRunningTracked(false);
            }
          })
          .catch(() => {});
      } else {
        fetch(`/api/sessions/${sid}/job`)
          .then((r) => {
            if (r.ok) return r.json();
            return null;
          })
          .then((job) => {
            if (job && (job.status === "running" || job.status === "pending")) {
              setRunningTracked(true);
            }
          })
          .catch(() => {});
      }
    };
    const onDisconnected = () => setConnected(false);

    const onSessionInit = (msg) => {
      setSessionInfo({
        sessionId: msg.session_id,
        tools: msg.tools,
        profiles: msg.profiles,
        canvas_enabled: msg.canvas_enabled ?? false,
        provider_override: msg.provider_override ?? null,
      });
      if (msg.provider_override) {
        setSelectedProvider(msg.provider_override);
      } else {
        setSelectedProvider("default");
      }
      if (msg.session_id) {
        sessionIdRef.current = msg.session_id;
        ws.setSessionId(msg.session_id);
      }
    };

    const onSessionTitle = (msg) => {
      setSessionTitle(msg.title);
    };

    const onRouting = () => {
      retrySnapshotRef.current = null;
      setRunningTracked(true);
      addMessage({ type: "routing" });
    };

    const onRouted = (msg) => {
      addMessage({
        type: "routed",
        profile: msg.profile,
        reason: msg.reason,
        elapsed: msg.elapsed,
      });
    };

    const onConfig = (msg) => {
      addMessage({
        type: "config",
        profile: msg.profile,
        model: msg.model,
        provider: msg.provider,
        mode: msg.mode,
        tools: msg.tools,
        sessionId: msg.session_id,
        noHistory: !!msg.no_history,
      });
      if (msg.mode) setActiveMode(msg.mode);
      if (msg.no_history) {
        setNoHistory(true);
        setIncognito(true);
      } else {
        setNoHistory(false);
      }
    };

    const onToolCall = (msg) => {
      const entry = { name: msg.name, args: msg.args };
      if (msg.guard) entry.guard = msg.guard;
      toolBufferRef.current.push(entry);

      if (liveToolCallsTsRef.current === null) {
        const ts = `${Date.now()}-${++msgSeqRef.current}`;
        liveToolCallsTsRef.current = ts;
        setMessages((prev) => [
          ...prev,
          {
            type: "tool_calls",
            calls: [entry],
            _ts: ts,
            _live: true,
          },
        ]);
      } else {
        const liveTs = liveToolCallsTsRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m._ts === liveTs ? { ...m, calls: [...m.calls, entry], _live: true } : m,
          ),
        );
      }
    };

    const onToolFlush = () => flushTools();

    const onConfirmRequest = (msg) => {
      flushTools();
      if (msg.auto_accepted) {
        addMessage({
          type: "confirm_auto_accepted",
          prompt: msg.prompt,
        });
        return;
      }
      setConfirm({ requestId: msg.request_id, prompt: msg.prompt });
    };

    const onSecretRequest = (msg) => {
      flushTools();
      setSecret({ requestId: msg.request_id, prompt: msg.prompt });
    };

    const onResultChunk = (msg) => {
      const token = msg.token || "";
      if (!token) return;

      if (liveResultTsRef.current === null) {
        const ts = `${Date.now()}-${++msgSeqRef.current}`;
        liveResultTsRef.current = ts;
        setMessages((prev) => [
          ...prev,
          {
            type: "result",
            text: token,
            _ts: ts,
            _streaming: true,
          },
        ]);
      } else {
        const liveTs = liveResultTsRef.current;
        setMessages((prev) =>
          prev.map((m) => (m._ts === liveTs ? { ...m, text: (m.text || "") + token } : m)),
        );
      }
    };

    const onResultDone = () => {
      if (liveResultTsRef.current !== null) {
        const liveTs = liveResultTsRef.current;
        setMessages((prev) =>
          prev.map((m) => (m._ts === liveTs ? { ...m, _streaming: false } : m)),
        );
      }
    };

    const onFileDiff = (msg) => {
      flushTools();
      addMessage({
        type: "file_diff",
        tool: msg.tool,
        action: msg.action,
        path: msg.path,
        pre_hash: msg.pre_hash,
        post_hash: msg.post_hash,
        snapshot_id: msg.snapshot_id,
        additions: msg.additions,
        deletions: msg.deletions,
        diff_text: msg.diff_text,
      });
    };

    const onResult = (msg) => {
      finalizeTools();
      if (liveResultTsRef.current !== null) {
        const liveTs = liveResultTsRef.current;
        liveResultTsRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m._ts === liveTs
              ? { ...m, text: msg.text, elapsed: msg.elapsed, _streaming: false }
              : m,
          ),
        );
      } else {
        addMessage({ type: "result", text: msg.text, elapsed: msg.elapsed });
      }
      setAgentStatus(null);
      setRunningTracked(false);
    };

    const onSummary = (msg) => {
      addMessage({
        type: "summary",
        iterations: msg.iterations,
        elapsed: msg.elapsed,
        toolCalls: msg.tool_calls,
        tools: msg.tools,
        models: msg.models,
      });

      setAgentStatus(null);
      setRunningTracked(false);

      liveToolCallsTsRef.current = null;
      liveResultTsRef.current = null;

      if (notificationsRef.current && document.hidden && typeof Notification !== "undefined") {
        const elapsed = msg.elapsed != null ? `${msg.elapsed.toFixed(1)}s` : "";
        const tools = msg.tool_calls ? `${msg.tool_calls} tool calls` : "";
        const body = [elapsed, tools].filter(Boolean).join(" · ") || "Run complete";
        try {
          new Notification("ScoutIX", { body, icon: "/favicon.ico", tag: "scout-run-done" });
        } catch (_) {
          /* ignore */
        }
      }
    };

    const onError = (msg) => {
      finalizeTools();
      liveResultTsRef.current = null;
      addMessage({
        type: "error",
        message: msg.message,
        recoverable: msg.recoverable,
      });
      setAgentStatus(null);
      setRunningTracked(false);
    };

    const onCancelled = (msg) => {
      finalizeTools();
      liveResultTsRef.current = null;
      addMessage({
        type: "cancelled",
        elapsed: msg.elapsed,
      });
      setAgentStatus(null);
      setRunningTracked(false);
    };

    const onAgentIteration = (msg) => {
      setAgentStatus({
        iteration: msg.iteration,
        maxIterations: msg.max_iterations,
        phase: "iterating",
        detail: null,
        elapsed: msg.elapsed,
      });
    };

    const onAgentThinking = (msg) => {
      setAgentStatus((prev) => ({
        ...(prev || {}),
        iteration: msg.iteration,
        phase: "thinking",
        detail: null,
        elapsed: msg.elapsed,
      }));
    };

    const onAgentToolExec = (msg) => {
      if (msg.status === "running") {
        setAgentStatus((prev) => ({
          ...(prev || {}),
          iteration: msg.iteration,
          phase: "tool_running",
          detail: { name: msg.name, args: msg.args },
          elapsed: msg.elapsed,
        }));
      } else if (msg.status === "done") {
        setAgentStatus((prev) => ({
          ...(prev || {}),
          iteration: msg.iteration,
          phase: "tool_done",
          detail: {
            name: msg.name,
            outputChars: msg.output_chars,
            isError: msg.is_error,
            toolElapsed: msg.elapsed_tool || msg.elapsed,
          },
          elapsed: msg.elapsed,
        }));
      }
    };

    const onPipelineStep = (msg) => {
      if (msg.status === "running") {
        setAgentStatus({
          iteration: null,
          maxIterations: null,
          phase: "pipeline_running",
          detail: { step: msg.step, text: msg.detail || msg.step },
          elapsed: msg.elapsed,
        });
      } else if (msg.status === "done") {
        setAgentStatus((prev) => ({
          ...(prev || {}),
          phase: "pipeline_done",
          detail: { step: msg.step, text: msg.step },
          elapsed: msg.elapsed,
        }));
      }
    };

    const onAgentRetry = (msg) => {
      addMessage({
        type: "agent_retry",
        iteration: msg.iteration,
        attempt: msg.attempt,
        maxAttempts: msg.max_attempts,
        reason: msg.reason,
        delaySeconds: msg.delay_seconds,
        elapsed: msg.elapsed,
      });
    };

    const onAgentRecovery = (msg) => {
      addMessage({
        type: "agent_recovery",
        iteration: msg.iteration,
        tool: msg.tool,
        error: msg.error,
        attempt: msg.attempt,
        maxRetries: msg.max_retries,
        elapsed: msg.elapsed,
      });
    };

    const onAgentEscalation = (msg) => {
      addMessage({
        type: "agent_escalation",
        iteration: msg.iteration,
        typeDetail: msg.type_detail,
        consecutiveErrors: msg.consecutive_errors,
        searchQuery: msg.search_query,
        elapsed: msg.elapsed,
      });
    };

    const onAgentWarning = (msg) => {
      addMessage({
        type: "agent_warning",
        iteration: msg.iteration,
        category: msg.category,
        message: msg.message,
        elapsed: msg.elapsed,
      });
    };

    const onModelFallback = (msg) => {
      addMessage({
        type: "model_fallback",
        prev_profile: msg.prev_profile,
        prev_model: msg.prev_model,
        next_profile: msg.next_profile,
        next_model: msg.next_model,
        reason: msg.reason,
        provider: msg.provider,
      });
    };

    const onSearchMeta = (msg) => {
      addMessage({
        type: "search_meta",
        refined_query: msg.refined_query,
        filters: msg.filters,
        result_count: msg.result_count,
        dropped_by_floor: msg.dropped_by_floor,
        best_score: msg.best_score,
        general_knowledge: msg.general_knowledge,
        intent: msg.intent,
        preferred_methods: msg.preferred_methods,
        demoted_by_method: msg.demoted_by_method,
        search_elapsed: msg.search_elapsed,
        is_sticky: msg.is_sticky,
        parsed_query: msg.parsed_query,
      });
    };

    const onDiscoveryScope = (msg) => {
      discoveryAreasRef.current = {};
      discoveryAreasRef.maxRounds = msg.max_rounds || 3;
      addMessage({
        type: "discovery_scope",
        areas: msg.areas,
        elapsed: msg.elapsed,
      });
    };

    const onDiscoveryArea = (msg) => {
      const areaId = msg.area_id;
      const event = msg.event;
      const prev = discoveryAreasRef.current[areaId] || {
        label: msg.label || areaId,
        status: "running",
        round: 0,
        maxRounds: 0,
        commands: 0,
        totalSize: "",
        elapsed: 0,
        errors: [],
      };

      if (event === "start") {
        prev.status = "running";
      } else if (event === "probe") {
        prev.status = "running";
        prev.round = msg.round || prev.round;
      } else if (event === "command") {
        prev.commands++;
      } else if (event === "result") {
        // command completed — status stays running
      } else if (event === "analyse") {
        prev.status = "analysing";
      } else if (event === "followup") {
        prev.status = "running";
        prev.round = (msg.round || prev.round) + 1;
      } else if (event === "finding") {
        prev.totalSize = msg.total_size || "";
      } else if (event === "done") {
        prev.status = "done";
        prev.maxRounds = msg.rounds || prev.round;
        prev.elapsed = msg.elapsed || 0;
        prev.totalSize = msg.total_size || prev.totalSize;
        if (msg.errors?.length) prev.errors = msg.errors;
      } else if (event === "error") {
        prev.status = "error";
        prev.errors = [...prev.errors, msg.message || "Unknown error"];
      }

      discoveryAreasRef.current[areaId] = prev;

      setMessages((prevMessages) => {
        const idx = prevMessages.findIndex((m) => m.type === "discovery_areas");
        const areaMsg = {
          type: "discovery_areas",
          areas: { ...discoveryAreasRef.current },
          maxRounds: discoveryAreasRef.maxRounds || 3,
          _ts: idx >= 0 ? prevMessages[idx]._ts : `${Date.now()}-${++msgSeqRef.current}`,
        };
        if (idx >= 0) {
          const updated = [...prevMessages];
          updated[idx] = areaMsg;
          return updated;
        }
        return [...prevMessages, areaMsg];
      });
    };

    const onDiscoveryPlan = (msg) => {
      addMessage({
        type: "discovery_plan",
        summary: msg.summary,
        total_reclaimable: msg.total_reclaimable,
        recommendations: msg.recommendations,
        elapsed: msg.elapsed,
      });
    };

    const onResearchPlan = (msg) => {
      researchAgentsRef.current = {};
      addMessage({
        type: "research_plan",
        msg: {
          sub_agents: msg.sub_agents || [],
          planner_elapsed: msg.planner_elapsed,
          progress: {},
        },
      });
    };

    const _updateResearchPlan = () => {
      setMessages((prevMessages) => {
        const idx = prevMessages.findIndex((m) => m.type === "research_plan");
        if (idx < 0) return prevMessages;
        const updated = [...prevMessages];
        updated[idx] = {
          ...updated[idx],
          msg: {
            ...updated[idx].msg,
            progress: { ...researchAgentsRef.current },
          },
        };
        return updated;
      });
    };

    const onResearchProgress = (msg) => {
      if (msg.phase === "aggregating" || msg.phase === "aggregated") {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.type === "research_plan");
          if (idx < 0) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            msg: {
              ...updated[idx].msg,
              aggregation: {
                status: msg.phase === "aggregating" ? "running" : "completed",
                elapsed: msg.aggregation_elapsed || null,
                sources_count: msg.sub_agents_completed || null,
              },
            },
          };
          return updated;
        });
        return;
      }

      if (msg.phase === "starting" && msg.sub_agents) {
        for (const sa of msg.sub_agents) {
          researchAgentsRef.current[sa.id] = {
            status: "running",
            tool_count: null,
            activity: [],
          };
        }
      } else if (msg.agent_id) {
        const agentId = msg.agent_id;
        const prev = researchAgentsRef.current[agentId] || {
          status: "running",
          tool_count: null,
          activity: [],
        };

        if (msg.phase === "completed") prev.status = "completed";
        else if (msg.phase === "error") prev.status = "error";
        else prev.status = msg.phase || prev.status;

        if (msg.tool_count != null) prev.tool_count = msg.tool_count;
        researchAgentsRef.current[agentId] = prev;
      }

      _updateResearchPlan();
    };

    const onResearchActivity = (msg) => {
      const agentId = msg.agent_id;
      if (!agentId) return;

      const prev = researchAgentsRef.current[agentId] || {
        status: "running",
        tool_count: null,
        activity: [],
      };

      if (msg.status === "running") {
        prev.activity = [
          ...prev.activity,
          { tool: msg.tool, args_preview: msg.args_preview || "", status: "running" },
        ];
      } else if (msg.status === "done") {
        const lastRunning = [...prev.activity]
          .reverse()
          .findIndex((a) => a.tool === msg.tool && a.status === "running");
        if (lastRunning >= 0) {
          const realIdx = prev.activity.length - 1 - lastRunning;
          prev.activity = [...prev.activity];
          prev.activity[realIdx] = {
            ...prev.activity[realIdx],
            status: "done",
            elapsed: msg.elapsed,
          };
        }
      }

      researchAgentsRef.current[agentId] = prev;
      _updateResearchPlan();
    };

    const onSchedulerJobCreated = (msg) => {
      addMessage({
        type: "scheduler.job_created",
        job_id: msg.job_id,
        label: msg.label,
        cron: msg.cron,
        cron_human: msg.cron_human,
        command: msg.command,
        elapsed: msg.elapsed,
      });
    };

    const onSchedulerGuardRejected = (msg) => {
      addMessage({
        type: "scheduler.guard_rejected",
        command: msg.command,
        verdict: msg.verdict,
      });
    };

    const onMonitorJobCreated = (msg) => {
      addMessage({
        type: "monitor.job_created",
        job_id: msg.job_id,
        label: msg.label,
        url: msg.url,
        cron: msg.cron,
        cron_human: msg.cron_human,
        extraction_mode: msg.extraction_mode,
        css_selector: msg.css_selector,
        initial_snapshot: msg.initial_snapshot,
        elapsed: msg.elapsed,
      });
    };

    const onMonitorJobUpdated = (msg) => {
      addMessage({
        type: "monitor.job_updated",
        job_id: msg.job_id,
        fields: msg.fields,
        elapsed: msg.elapsed,
      });
    };

    const onMonitorJobDeleted = (msg) => {
      addMessage({
        type: "monitor.job_deleted",
        job_id: msg.job_id,
        label: msg.label,
        elapsed: msg.elapsed,
      });
    };

    const onMonitorCheckCompleted = (msg) => {
      addMessage({
        type: "monitor.check_completed",
        job_id: msg.job_id,
        label: msg.label,
        status: msg.status,
        diff_summary: msg.diff_summary,
        lines_added: msg.lines_added,
        lines_removed: msg.lines_removed,
        elapsed: msg.elapsed,
      });
    };

    const onContextUsage = (msg) => {
      setContextUsage({
        used_tokens: msg.used_tokens,
        max_tokens: msg.max_tokens,
        percent: msg.percent,
        message_count: msg.message_count,
        token_usage: msg.token_usage || null,
      });
    };

    const onSessionCompacted = (msg) => {
      setMessages([
        {
          type: "compacted",
          summary: msg.summary,
          _ts: `${Date.now()}-${++msgSeqRef.current}`,
        },
      ]);
      setContextUsage(null);
      setRunningTracked(false);
    };

    const onInstructionSaved = (msg) => {
      setInstructions((prev) => [
        ...prev.filter((i) => i.id !== msg.instruction_id),
        { id: msg.instruction_id, text: msg.text, scope: msg.scope },
      ]);
    };

    const onInstructionCleared = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      fetch(`/api/sessions/${sid}/instructions`)
        .then((r) => r.json())
        .then((data) => setInstructions(data))
        .catch(() => setInstructions([]));
    };

    const onInstructionsList = (msg) => {
      setInstructions(msg.instructions || []);
    };

    ws.on("connected", onConnected);
    ws.on("disconnected", onDisconnected);
    ws.on("session.init", onSessionInit);
    ws.on("session.title", onSessionTitle);
    ws.on("agent.routing", onRouting);
    ws.on("agent.routed", onRouted);
    ws.on("agent.config", onConfig);
    ws.on("tool.call", onToolCall);
    ws.on("tool.calls.flush", onToolFlush);
    ws.on("confirm.request", onConfirmRequest);
    ws.on("secret.request", onSecretRequest);
    ws.on("result.chunk", onResultChunk);
    ws.on("result.done", onResultDone);
    ws.on("file.diff", onFileDiff);
    ws.on("agent.result", onResult);
    ws.on("agent.summary", onSummary);
    ws.on("agent.error", onError);
    ws.on("agent.cancelled", onCancelled);
    ws.on("run.idle", () => {
      setRunningTracked(false);
      liveToolCallsTsRef.current = null;
      liveResultTsRef.current = null;
    });
    ws.on("agent.iteration", onAgentIteration);
    ws.on("agent.thinking", onAgentThinking);
    ws.on("agent.tool_exec", onAgentToolExec);
    ws.on("pipeline.step", onPipelineStep);
    ws.on("agent.retry", onAgentRetry);
    ws.on("agent.recovery", onAgentRecovery);
    ws.on("agent.escalation", onAgentEscalation);
    ws.on("agent.warning", onAgentWarning);
    ws.on("agent.model_fallback", onModelFallback);
    ws.on("search.meta", onSearchMeta);
    ws.on("discovery.scope", onDiscoveryScope);
    ws.on("discovery.area", onDiscoveryArea);
    ws.on("discovery.plan", onDiscoveryPlan);
    ws.on("research.plan", onResearchPlan);
    ws.on("research.progress", onResearchProgress);
    ws.on("research.activity", onResearchActivity);
    ws.on("scheduler.job_created", onSchedulerJobCreated);
    ws.on("scheduler.guard_rejected", onSchedulerGuardRejected);
    ws.on("monitor.job_created", onMonitorJobCreated);
    ws.on("monitor.job_updated", onMonitorJobUpdated);
    ws.on("monitor.job_deleted", onMonitorJobDeleted);
    ws.on("monitor.check_completed", onMonitorCheckCompleted);
    ws.on("context.usage", onContextUsage);
    ws.on("session.compacted", onSessionCompacted);
    ws.on("instruction.saved", onInstructionSaved);
    ws.on("instruction.cleared", onInstructionCleared);
    ws.on("instructions.list", onInstructionsList);

    const onRetryError = (msg) => {
      const snap = retrySnapshotRef.current;
      if (snap) {
        setMessages((prev) => [...prev, ...snap.removed]);
        retrySnapshotRef.current = null;
      }
      addMessage({
        type: "error",
        message: `Retry failed: ${msg?.reason || "unknown"}`,
      });
    };
    ws.on("query.retry.error", onRetryError);

    ws.connect({ sessionId: urlSessionId || undefined });

    return () => {
      ws.off("connected", onConnected);
      ws.off("disconnected", onDisconnected);
      ws.off("session.init", onSessionInit);
      ws.off("session.title", onSessionTitle);
      ws.off("agent.routing", onRouting);
      ws.off("agent.routed", onRouted);
      ws.off("agent.config", onConfig);
      ws.off("tool.call", onToolCall);
      ws.off("tool.calls.flush", onToolFlush);
      ws.off("confirm.request", onConfirmRequest);
      ws.off("secret.request", onSecretRequest);
      ws.off("result.chunk", onResultChunk);
      ws.off("result.done", onResultDone);
      ws.off("file.diff", onFileDiff);
      ws.off("agent.result", onResult);
      ws.off("agent.summary", onSummary);
      ws.off("agent.error", onError);
      ws.off("agent.cancelled", onCancelled);
      ws.off("agent.iteration", onAgentIteration);
      ws.off("agent.thinking", onAgentThinking);
      ws.off("agent.tool_exec", onAgentToolExec);
      ws.off("pipeline.step", onPipelineStep);
      ws.off("agent.retry", onAgentRetry);
      ws.off("agent.recovery", onAgentRecovery);
      ws.off("agent.escalation", onAgentEscalation);
      ws.off("agent.warning", onAgentWarning);
      ws.off("agent.model_fallback", onModelFallback);
      ws.off("search.meta", onSearchMeta);
      ws.off("discovery.scope", onDiscoveryScope);
      ws.off("discovery.area", onDiscoveryArea);
      ws.off("discovery.plan", onDiscoveryPlan);
      ws.off("research.plan", onResearchPlan);
      ws.off("research.progress", onResearchProgress);
      ws.off("research.activity", onResearchActivity);
      ws.off("scheduler.job_created", onSchedulerJobCreated);
      ws.off("scheduler.guard_rejected", onSchedulerGuardRejected);
      ws.off("monitor.job_created", onMonitorJobCreated);
      ws.off("monitor.job_updated", onMonitorJobUpdated);
      ws.off("monitor.job_deleted", onMonitorJobDeleted);
      ws.off("monitor.check_completed", onMonitorCheckCompleted);
      ws.off("context.usage", onContextUsage);
      ws.off("session.compacted", onSessionCompacted);
      ws.off("instruction.saved", onInstructionSaved);
      ws.off("instruction.cleared", onInstructionCleared);
      ws.off("instructions.list", onInstructionsList);
      ws.off("query.retry.error", onRetryError);
    };
  }, [urlSessionId, addMessage, setRunningTracked]);

  const [pendingFiles, setPendingFiles] = useState([]);

  useEffect(() => {
    if (!urlSessionId) return;
    try {
      const stored = localStorage.getItem(`agentforge:draft-attachments:${urlSessionId}`);
      if (!stored) return;
      const results = JSON.parse(stored);
      if (!Array.isArray(results) || results.length === 0) return;
      setPendingFiles(
        results.map((sf) => ({
          file: new File([], sf.name, { type: sf.content_type || "application/octet-stream" }),
          status: "ready",
          result: sf,
          error: null,
          _serverGenerated: true,
        })),
      );
    } catch {
      /* ignore a corrupt draft-attachments entry */
    }
  }, [urlSessionId]);

  const draftAttachReadyRef = useRef(false);
  useEffect(() => {
    if (!draftAttachReadyRef.current) {
      draftAttachReadyRef.current = true;
      return;
    }
    const sid = sessionIdRef.current;
    if (!sid) return;
    const key = `agentforge:draft-attachments:${sid}`;
    const ready = pendingFiles.filter((pf) => pf.status === "ready" && pf.result);
    if (ready.length > 0) {
      localStorage.setItem(key, JSON.stringify(ready.map((pf) => pf.result)));
    } else {
      localStorage.removeItem(key);
    }
  }, [pendingFiles]);

  const ensureSessionId = useCallback(() => {
    let sid = sessionIdRef.current;
    if (!sid) {
      sid = uuidv7();
      sessionIdRef.current = sid;
      window.history.replaceState(null, "", `/chat/${sid}`);
    }
    ws.setSessionId(sid);
    return sid;
  }, []);

  const uploadFiles = useCallback(
    async (newFiles) => {
      if (!newFiles || newFiles.length === 0) return;

      const sessionId = ensureSessionId();

      const entries = newFiles.map((file) => ({
        file,
        status: "uploading",
        result: null,
        error: null,
      }));
      setPendingFiles((prev) => [...prev, ...entries]);

      try {
        const formData = new FormData();
        newFiles.forEach((f) => {
          formData.append("files", f);
        });
        const res = await fetch(`/api/upload/${sessionId}`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const serverFiles = data.files || [];

          const matchedNames = new Set();

          setPendingFiles((prev) => {
            const updated = prev.map((entry) => {
              if (entry.status !== "uploading") return entry;
              const match = serverFiles.find((sf) => sf.name === entry.file.name);
              if (match) {
                matchedNames.add(match.name);
                return { ...entry, status: "ready", result: match };
              }
              return entry;
            });

            const extras = serverFiles
              .filter((sf) => !matchedNames.has(sf.name))
              .map((sf) => ({
                file: new File([], sf.name, { type: sf.content_type || "image/png" }),
                status: "ready",
                result: sf,
                error: null,
                _serverGenerated: true,
              }));

            return extras.length > 0 ? [...updated, ...extras] : updated;
          });
        } else {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          const errorMsg = err.detail || res.statusText;
          setPendingFiles((prev) =>
            prev.map((entry) =>
              entry.status === "uploading" ? { ...entry, status: "error", error: errorMsg } : entry,
            ),
          );
        }
      } catch (e) {
        setPendingFiles((prev) =>
          prev.map((entry) =>
            entry.status === "uploading" ? { ...entry, status: "error", error: e.message } : entry,
          ),
        );
      }
    },
    [ensureSessionId],
  );

  const removePendingFile = useCallback((index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const sendQuery = useCallback(
    async (text, _files = [], _modelOverride = "auto", profileOverrides = {}) => {
      const currentSessionId = ensureSessionId();

      const readyFiles = pendingFiles.filter((pf) => pf.status === "ready" && pf.result);
      const stillUploading = pendingFiles.filter((pf) => pf.status === "uploading");

      if (stillUploading.length > 0) {
        console.warn("sendQuery called while files still uploading — sending without them");
      }

      const attachments = readyFiles.map((pf) => ({ ...pf.result }));

      addMessage({
        type: "query",
        text: text || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : ""),
        attachments,
      });

      const overrides = {};
      if (Object.keys(profileOverrides).length > 0) overrides.profiles = profileOverrides;
      if (incognito) overrides.incognito = true;

      const alreadyStamped = !!sessionInfo?.provider_override;
      if (selectedProvider && selectedProvider !== "default" && !alreadyStamped) {
        overrides.provider = selectedProvider;
      }

      ws.sendQuery(
        text,
        currentSessionId,
        attachments.length > 0 ? attachments : undefined,
        Object.keys(overrides).length > 0 ? overrides : undefined,
      );

      setRunningTracked(true);
      setPendingFiles([]);
    },
    [
      addMessage,
      ensureSessionId,
      incognito,
      pendingFiles,
      selectedProvider,
      sessionInfo?.provider_override,
      setRunningTracked,
    ],
  );

  const retryQuery = useCallback((promptText, editedText) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || !promptText) return;

    setMessages((prev) => {
      let cut = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) {
        const m = prev[i];
        if (m.type === "query" && m.text === promptText) {
          cut = i;
          break;
        }
      }
      retrySnapshotRef.current = { cut, removed: prev.slice(cut) };
      return prev.slice(0, cut);
    });

    ws.retryQuery(currentSessionId, promptText, editedText);
  }, []);

  const rerouteQuery = useCallback(
    (originalText, originalMode, newMode) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId || !originalText || !newMode) return;

      setMessages((prev) => {
        let cut = prev.length;
        for (let i = prev.length - 1; i >= 0; i--) {
          const m = prev[i];
          if (m.type === "query" && m.text === originalText) {
            cut = i + 1;
            break;
          }
        }
        retrySnapshotRef.current = { cut, removed: prev.slice(cut) };
        return prev.slice(0, cut);
      });

      ws.rerouteQuery(currentSessionId, originalText, originalMode || "", newMode);
      setRunningTracked(true);
    },
    [setRunningTracked],
  );

  const respondConfirm = useCallback(
    (confirmed, { autoAccept = false } = {}) => {
      if (!confirm) return;
      ws.sendConfirmResponse(confirm.requestId, confirmed, { autoAccept });
      addMessage({
        type: "confirm_answer",
        prompt: confirm.prompt,
        confirmed,
        autoAccepted: autoAccept,
      });
      setConfirm(null);
    },
    [confirm, addMessage],
  );

  const respondSecret = useCallback(
    (value, cancelled = false) => {
      if (!secret) return;
      ws.sendSecretResponse(secret.requestId, value, cancelled);
      addMessage({ type: "secret_answer", cancelled: cancelled || value == null });
      setSecret(null);
    },
    [secret, addMessage],
  );

  const cancelRun = useCallback(() => {
    ws.sendCancel();
  }, []);

  const compactSession = useCallback(() => {
    ws.sendCompactSession();
    setRunningTracked(true);
    addMessage({ type: "compacting" });
  }, [addMessage, setRunningTracked]);

  const saveCommandNote = useCallback(async (messageTs, queryTitle, calls) => {
    const sessionId = sessionIdRef.current;
    const title = queryTitle || calls.map((c) => c.name).join(" + ") || "Command note";
    const body = {
      session_id: sessionId || null,
      title,
      commands: calls.map(({ name, args }) => ({ name, args })),
      message_ts: messageTs,
    };
    const resp = await fetch("/api/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const note = await resp.json();
      setCommandNotes((prev) => {
        const next = new Map(prev);
        next.set(messageTs, { note_id: note.id, title: note.title });
        return next;
      });
    }
  }, []);

  const removeCommandNote = useCallback(
    async (messageTs) => {
      const entry = commandNotes.get(messageTs);
      if (!entry) return;
      const resp = await fetch(`/api/commands/${entry.note_id}`, { method: "DELETE" });
      if (resp.ok) {
        setCommandNotes((prev) => {
          const next = new Map(prev);
          next.delete(messageTs);
          return next;
        });
      }
    },
    [commandNotes],
  );

  const saveAnswerNote = useCallback(async (messageTs, content, queryTitle) => {
    const sessionId = sessionIdRef.current;
    const body = {
      session_id: sessionId || null,
      title: queryTitle || "",
      kind: "answer",
      content: content || "",
      commands: [],
      message_ts: messageTs,
    };
    const resp = await fetch("/api/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const note = await resp.json();
      setCommandNotes((prev) => {
        const next = new Map(prev);
        next.set(messageTs, { note_id: note.id, title: note.title });
        return next;
      });
    }
  }, []);

  const savedNoteTsSet = commandNotes.size > 0 ? new Set(commandNotes.keys()) : null;

  return {
    connected,
    messages,
    running,
    confirm,
    secret,
    sessionInfo,
    sessionTitle,
    sendQuery,
    retryQuery,
    rerouteQuery,
    respondConfirm,
    respondSecret,
    cancelRun,
    agentStatus,
    contextUsage,
    compactSession,
    incognito,
    setIncognito,
    toggleIncognito,
    noHistory,
    notificationsEnabled,
    toggleNotifications,
    presets,
    availableSkills,
    activeMode,
    providers,
    selectedProvider,
    setSelectedProvider,
    pendingFiles,
    uploadFiles,
    removePendingFile,
    clearPendingFiles,
    uploadLimits,
    instructions,
    deleteInstruction: useCallback((id) => {
      fetch(`/api/instructions/${id}`, { method: "DELETE" })
        .then(() => setInstructions((prev) => prev.filter((i) => i.id !== id)))
        .catch(() => {});
    }, []),
    savedNoteTsSet,
    saveCommandNote,
    saveAnswerNote,
    removeCommandNote,
    hasMoreMessages,
    loadingMore,
    loadMoreMessages,
  };
};

const restoreMessages = (dbMessages) => {
  const restored = [];
  let seq = 0;
  let sawToolCallsInTurn = false;

  for (const msg of dbMessages) {
    const meta = msg.metadata || {};
    seq++;

    switch (msg.type) {
      case "query":
        sawToolCallsInTurn = false;
        restored.push({
          type: "query",
          text: msg.content || meta.text || "",
          attachments: meta.attachments || [],
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "routing":
        restored.push({
          type: "routing",
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "routed":
        restored.push({
          type: "routed",
          profile: meta.profile,
          reason: meta.reason,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "config":
        restored.push({
          type: "config",
          profile: meta.profile,
          model: meta.model,
          provider: meta.provider,
          mode: meta.mode,
          tools: meta.tools,
          sessionId: meta.session_id,
          memory_tier: meta.memory_tier,
          noHistory: !!meta.no_history,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "tool_calls":
        sawToolCallsInTurn = true;
        restored.push({
          type: "tool_calls",
          calls: meta.calls || [],
          _restored: true,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "file_diff":
        restored.push({
          type: "file_diff",
          tool: meta.tool,
          action: meta.action,
          path: meta.path,
          pre_hash: meta.pre_hash,
          post_hash: meta.post_hash,
          snapshot_id: meta.snapshot_id,
          additions: meta.additions,
          deletions: meta.deletions,
          diff_text: meta.diff_text,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "confirm_prompt":
        restored.push({
          type: "confirm_prompt",
          prompt: meta.prompt,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "confirm_answer":
        restored.push({
          type: "confirm_answer",
          prompt: meta.prompt,
          confirmed: meta.confirmed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "result":
        if (msg.tool_calls && msg.tool_calls.length > 0 && !sawToolCallsInTurn) {
          seq++;
          restored.push({
            type: "tool_calls",
            calls: msg.tool_calls,
            _restored: true,
            _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
          });
          seq++;
        }
        sawToolCallsInTurn = false;
        restored.push({
          type: "result",
          text: msg.content || meta.text || "",
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "summary":
        restored.push({
          type: "summary",
          iterations: meta.iterations,
          elapsed: meta.elapsed,
          toolCalls: meta.tool_calls,
          tools: meta.tools,
          models: meta.models,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "error":
        restored.push({
          type: "error",
          message: msg.content || meta.message || "",
          recoverable: meta.recoverable,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "search_meta":
        restored.push({
          type: "search_meta",
          refined_query: meta.refined_query,
          filters: meta.filters || {},
          result_count: meta.result_count,
          dropped_by_floor: meta.dropped_by_floor,
          best_score: meta.best_score,
          general_knowledge: meta.general_knowledge,
          intent: meta.intent,
          preferred_methods: meta.preferred_methods || [],
          demoted_by_method: meta.demoted_by_method || 0,
          search_elapsed: meta.search_elapsed || 0,
          is_sticky: meta.is_sticky || false,
          parsed_query: meta.parsed_query || null,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "discovery.scope":
        restored.push({
          type: "discovery_scope",
          areas: meta.areas || [],
          elapsed: meta.elapsed || 0,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "discovery.plan":
        if (meta.plan) {
          restored.push({
            type: "discovery_plan",
            summary: meta.plan.summary || meta.summary || "",
            total_reclaimable: meta.plan.total_reclaimable || meta.total_reclaimable || "",
            recommendations: meta.plan.recommendations || meta.recommendations || [],
            elapsed: meta.elapsed || 0,
            _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
          });
        } else if (meta.recommendations) {
          restored.push({
            type: "discovery_plan",
            summary: meta.summary || "",
            total_reclaimable: meta.total_reclaimable || "",
            recommendations: meta.recommendations || [],
            elapsed: meta.elapsed || 0,
            _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
          });
        }
        break;

      case "research.plan":
        restored.push({
          type: "research_plan",
          msg: {
            sub_agents: meta.sub_agents || [],
            planner_elapsed: meta.planner_elapsed,
            progress: meta.progress || {},
            aggregation: meta.aggregation || null,
          },
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "agent.retry":
        restored.push({
          type: "agent_retry",
          iteration: meta.iteration,
          attempt: meta.attempt,
          maxAttempts: meta.max_attempts,
          reason: meta.reason,
          delaySeconds: meta.delay_seconds,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "agent.recovery":
        restored.push({
          type: "agent_recovery",
          iteration: meta.iteration,
          tool: meta.tool,
          error: meta.error,
          attempt: meta.attempt,
          maxRetries: meta.max_retries,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "agent.escalation":
        restored.push({
          type: "agent_escalation",
          iteration: meta.iteration,
          typeDetail: meta.type_detail,
          consecutiveErrors: meta.consecutive_errors,
          searchQuery: meta.search_query,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "agent.warning":
        restored.push({
          type: "agent_warning",
          iteration: meta.iteration,
          category: meta.category,
          message: meta.message,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "scheduler.job_created":
        restored.push({
          type: "scheduler.job_created",
          job_id: meta.job_id,
          label: meta.label,
          cron: meta.cron,
          cron_human: meta.cron_human,
          command: meta.command,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "scheduler.guard_rejected":
        restored.push({
          type: "scheduler.guard_rejected",
          command: meta.command,
          verdict: meta.verdict,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "monitor.job_created":
        restored.push({
          type: "monitor.job_created",
          job_id: meta.job_id,
          label: meta.label,
          url: meta.url,
          cron: meta.cron,
          cron_human: meta.cron_human,
          extraction_mode: meta.extraction_mode,
          css_selector: meta.css_selector,
          initial_snapshot: meta.initial_snapshot,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "monitor.job_updated":
        restored.push({
          type: "monitor.job_updated",
          job_id: meta.job_id,
          fields: meta.fields,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "monitor.job_deleted":
        restored.push({
          type: "monitor.job_deleted",
          job_id: meta.job_id,
          label: meta.label,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      case "monitor.check_completed":
        restored.push({
          type: "monitor.check_completed",
          job_id: meta.job_id,
          label: meta.label,
          status: meta.status,
          diff_summary: meta.diff_summary,
          lines_added: meta.lines_added,
          lines_removed: meta.lines_removed,
          elapsed: meta.elapsed,
          _ts: `${new Date(msg.created_at).getTime()}-${seq}`,
        });
        break;

      default:
        // Unknown type — skip
        break;
    }
  }

  return restored;
};
