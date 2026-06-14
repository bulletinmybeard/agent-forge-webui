import { useCallback, useEffect, useMemo, useRef } from "react";
import AgentEscalationMessage from "./messages/AgentEscalationMessage";
import AgentRecoveryMessage from "./messages/AgentRecoveryMessage";
import AgentRetryMessage from "./messages/AgentRetryMessage";
import AgentWarningMessage from "./messages/AgentWarningMessage";
import CancelledMessage from "./messages/CancelledMessage";
import CompactedMessage from "./messages/CompactedMessage";
import CompactingMessage from "./messages/CompactingMessage";
import ConfigMessage from "./messages/ConfigMessage";
import ConfirmDialog from "./messages/ConfirmDialog";
import DiscoveryAreaMessage from "./messages/DiscoveryAreaMessage";
import DiscoveryPlanMessage from "./messages/DiscoveryPlanMessage";
import DiscoveryScopeMessage from "./messages/DiscoveryScopeMessage";
import ErrorMessage from "./messages/ErrorMessage";
import FileDiffMessage from "./messages/FileDiffMessage";
import ModelFallbackMessage from "./messages/ModelFallbackMessage";
import MonitorJobMessage from "./messages/MonitorJobMessage";
import QueryMessage from "./messages/QueryMessage";
import ResearchPlanMessage from "./messages/ResearchPlanMessage";
import ResultMessage from "./messages/ResultMessage";
import RoutingMessage from "./messages/RoutingMessage";
import SchedulerJobMessage from "./messages/SchedulerJobMessage";
import SearchMetaMessage from "./messages/SearchMetaMessage";
import SecretDialog from "./messages/SecretDialog";
import SummaryMessage from "./messages/SummaryMessage";
import ToolCallsPanel from "./messages/ToolCallsPanel";

const MESSAGE_COMPONENTS = {
  query: QueryMessage,
  routing: RoutingMessage,
  routed: RoutingMessage,
  config: ConfigMessage,
  search_meta: SearchMetaMessage,
  tool_calls: ToolCallsPanel,
  file_diff: FileDiffMessage,
  confirm_answer: ConfirmDialog,
  confirm_auto_accepted: ConfirmDialog,
  secret_answer: SecretDialog,
  result: ResultMessage,
  summary: SummaryMessage,
  error: ErrorMessage,
  discovery_scope: DiscoveryScopeMessage,
  discovery_areas: DiscoveryAreaMessage,
  discovery_plan: DiscoveryPlanMessage,
  agent_retry: AgentRetryMessage,
  agent_recovery: AgentRecoveryMessage,
  agent_escalation: AgentEscalationMessage,
  agent_warning: AgentWarningMessage,
  "scheduler.job_created": SchedulerJobMessage,
  "scheduler.guard_rejected": SchedulerJobMessage,
  "monitor.job_created": MonitorJobMessage,
  "monitor.job_updated": MonitorJobMessage,
  "monitor.job_deleted": MonitorJobMessage,
  "monitor.check_completed": MonitorJobMessage,
  research_plan: ResearchPlanMessage,
  cancelled: CancelledMessage,
  compacting: CompactingMessage,
  compacted: CompactedMessage,
  model_fallback: ModelFallbackMessage,
};

const AgentStatusLine = ({ status }) => {
  if (!status) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-1">
        <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
        Agent is working...
      </div>
    );
  }

  const { iteration, maxIterations, phase, detail } = status;

  if (phase === "pipeline_running" || phase === "pipeline_done") {
    const stepName = detail?.step || "";
    const stepLabel = stepName.charAt(0).toUpperCase() + stepName.slice(1);
    const text =
      phase === "pipeline_running" ? detail?.text || `${stepLabel}...` : `${stepLabel} done`;

    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-1">
        <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
        <span>{text}</span>
      </div>
    );
  }

  const iterLabel = maxIterations
    ? `Iteration ${iteration}/${maxIterations}`
    : `Iteration ${iteration}`;

  let phaseText = "";
  if (phase === "thinking" || phase === "iterating") {
    phaseText = "Thinking...";
  } else if (phase === "tool_running" && detail) {
    const argPreview = detail.args ? Object.values(detail.args)[0] || "" : "";
    const truncated = argPreview.length > 60 ? `${argPreview.slice(0, 57)}...` : argPreview;
    phaseText = truncated ? `Running ${detail.name}("${truncated}")` : `Running ${detail.name}`;
  } else if (phase === "tool_done" && detail) {
    const size =
      detail.outputChars > 1000
        ? `${(detail.outputChars / 1024).toFixed(1)}KB`
        : `${detail.outputChars} chars`;
    phaseText = detail.isError ? `${detail.name} failed` : `${detail.name} done (${size})`;
  }

  return (
    <div className="flex items-center gap-2 text-gray-500 text-sm py-1">
      <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
      <span className="text-gray-400">{iterLabel}</span>
      <span className="text-gray-600">—</span>
      <span>{phaseText}</span>
    </div>
  );
};

export default function MessageList({
  messages,
  running,
  confirm,
  onConfirm,
  secret,
  onSecret,
  agentStatus,
  savedNoteTsSet,
  onSaveToolCalls,
  onRemoveToolCalls,
  onSaveAnswer,
  onRemoveAnswer,
  onRerun,
  retryQuery,
  rerouteQuery,
  onPinAnchor,
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore,
}) {
  const bottomRef = useRef(null);
  const sentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const hashScrolled = useRef(false);
  const prevMsgCountRef = useRef(messages.length);
  const suppressAutoScroll = useRef(false);
  const isNearBottom = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const prevCount = prevMsgCountRef.current;
    const curCount = messages.length;
    const prepended = curCount > prevCount && suppressAutoScroll.current;

    if (prepended) {
      const savedScrollHeight = container.dataset.savedScrollHeight;
      if (savedScrollHeight) {
        const delta = container.scrollHeight - Number(savedScrollHeight);
        container.scrollTop += delta;
        delete container.dataset.savedScrollHeight;
      }
      suppressAutoScroll.current = false;
    }

    prevMsgCountRef.current = curCount;
  }, [messages]);

  useEffect(() => {
    if (suppressAutoScroll.current) return;

    if (!hashScrolled.current && window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        hashScrolled.current = true;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-1", "ring-indigo-500/50", "rounded");
        setTimeout(() => target.classList.remove("ring-1", "ring-indigo-500/50", "rounded"), 2000);
        return;
      }
    }

    const lastMsg = messages[messages.length - 1];
    const isNewQuery = lastMsg?.type === "query";

    if (isNearBottom.current || isNewQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 120;
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!onLoadMore || loadingMore || !hasMoreMessages) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.dataset.savedScrollHeight = String(container.scrollHeight);
      suppressAutoScroll.current = true;
    }
    onLoadMore();
  }, [onLoadMore, loadingMore, hasMoreMessages]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { root: container, rootMargin: "200px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const turns = useMemo(() => {
    const groups = [];
    let current = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.type === "query") {
        if (current) groups.push(current);
        current = { query: { msg, idx: i }, responses: [] };
      } else {
        if (!current) {
          current = { query: null, responses: [] };
        }
        current.responses.push({ msg, idx: i });
      }
    }
    if (current) groups.push(current);
    return groups;
  }, [messages]);

  const lastPromptTs = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === "query") return messages[i]._ts;
    }
    return null;
  }, [messages]);

  const canRetry = !running;
  const userBg = "#49505f45";
  const modelBg = "transparent";
  const userBlockClass = "rounded-lg border border-gray-800/60 px-4 py-2";
  const modelBlockClass = "rounded-lg border border-gray-800/60 px-4 py-3 space-y-2";
  const userBlockStyle = { backgroundColor: userBg };
  const modelBlockStyle = { backgroundColor: modelBg };

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
      <div className="max-w-6xl mx-auto px-6 space-y-4">
        <div ref={sentinelRef} className="h-0" />
        {hasMoreMessages && loadingMore && (
          <div className="flex items-center justify-center py-3">
            <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full animate-pulse mr-2" />
            <span className="text-sm text-gray-500">Loading older messages...</span>
          </div>
        )}
        {(() => {
          let lastQueryTitle = "";
          return turns.map((turn, turnIdx) => {
            let queryEl = null;
            if (turn.query) {
              const { msg, idx } = turn.query;
              const Component = MESSAGE_COMPONENTS[msg.type];
              if (Component) {
                lastQueryTitle = msg.text || msg.content || "";
                const queryExtraProps = {};
                if (onPinAnchor && msg._ts) {
                  queryExtraProps.onPinAnchor = (label) =>
                    onPinAnchor(`msg-${msg._ts}`, label || (msg.text || "").slice(0, 60));
                }
                if (retryQuery) {
                  queryExtraProps.isLast = msg._ts === lastPromptTs;
                  queryExtraProps.canRetry = canRetry;
                  queryExtraProps.onRetry = () => retryQuery(msg.text);
                  queryExtraProps.onEditSubmit = (newText) => retryQuery(msg.text, newText);
                }
                queryEl = (
                  <div
                    key={msg._ts || idx}
                    className={`group ${userBlockClass}`}
                    style={userBlockStyle}
                  >
                    <Component {...msg} {...queryExtraProps} />
                  </div>
                );
              }
            }

            let responseEl = null;
            if (turn.responses.length > 0) {
              const responseChildren = turn.responses.map(({ msg, idx }) => {
                const Component = MESSAGE_COMPONENTS[msg.type];
                if (!Component) return null;

                let extraProps = {};
                if (msg.type === "tool_calls" && (onSaveToolCalls || onRemoveToolCalls)) {
                  const ts = msg._ts;
                  const isSaved = savedNoteTsSet ? savedNoteTsSet.has(ts) : false;
                  const capturedTitle = lastQueryTitle;
                  extraProps = {
                    isSaved,
                    onSave: onSaveToolCalls
                      ? () => onSaveToolCalls(ts, capturedTitle, msg.calls || [])
                      : undefined,
                    onRemove: onRemoveToolCalls ? () => onRemoveToolCalls(ts) : undefined,
                  };
                }

                if (msg.type === "summary" && onRerun && lastQueryTitle) {
                  const capturedQuery = lastQueryTitle;
                  extraProps.onRerun = () => onRerun(capturedQuery);
                }

                if (msg.type === "routed" && rerouteQuery && lastQueryTitle) {
                  const capturedQuery = lastQueryTitle;
                  const capturedMode = msg.profile;
                  extraProps.onReroute = (newMode) =>
                    rerouteQuery(capturedQuery, capturedMode, newMode);
                }

                if (msg.type === "result") {
                  if (lastQueryTitle) extraProps.query = lastQueryTitle;
                  if (onSaveAnswer || onRemoveAnswer) {
                    const ts = msg._ts;
                    extraProps.isSaved = savedNoteTsSet ? savedNoteTsSet.has(ts) : false;
                    extraProps.onSave = onSaveAnswer
                      ? (content) => onSaveAnswer(ts, content, lastQueryTitle || "")
                      : undefined;
                    extraProps.onRemove = onRemoveAnswer ? () => onRemoveAnswer(ts) : undefined;
                  }
                }

                return (
                  <div key={msg._ts || idx} className="group">
                    <Component {...msg} {...extraProps} />
                  </div>
                );
              });

              responseEl = (
                <div key={`resp-${turnIdx}`} className={modelBlockClass} style={modelBlockStyle}>
                  {responseChildren}
                </div>
              );
            }

            return (
              <div key={`turn-${turnIdx}`}>
                {turnIdx > 0 && <div className="border-t border-gray-800/40 my-5" />}
                {queryEl}
                {responseEl && <div className="mt-2">{responseEl}</div>}
              </div>
            );
          });
        })()}

        {confirm && (
          <ConfirmDialog type="confirm_prompt" prompt={confirm.prompt} onConfirm={onConfirm} />
        )}

        {secret && <SecretDialog type="secret_prompt" prompt={secret.prompt} onSubmit={onSecret} />}

        {running && !confirm && !secret && <AgentStatusLine status={agentStatus} />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
