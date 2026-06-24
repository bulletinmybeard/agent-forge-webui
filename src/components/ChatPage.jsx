import { useAgent } from "../hooks/useAgent";
import useDocumentTitle from "../hooks/useDocumentTitle";
import ChatView from "./ChatView";
import KnowledgeBar from "./KnowledgeBar";
import StatusBar from "./StatusBar";

export default function ChatPage() {
  const agent = useAgent();
  useDocumentTitle(agent.sessionTitle);

  return (
    <div className="flex flex-col h-full min-h-0">
      <StatusBar
        connected={agent.connected}
        sessionInfo={agent.sessionInfo}
        sessionTitle={agent.sessionTitle}
        contextUsage={agent.contextUsage}
      />
      <KnowledgeBar />
      <ChatView
        messages={agent.messages}
        connected={agent.connected}
        running={agent.running}
        confirm={agent.confirm}
        secret={agent.secret}
        onSendQuery={agent.sendQuery}
        onConfirm={agent.respondConfirm}
        onSecret={agent.respondSecret}
        onCancel={agent.cancelRun}
        pendingFiles={agent.pendingFiles}
        onFilesAttached={agent.uploadFiles}
        onRemoveFile={agent.removePendingFile}
        contextUsage={agent.contextUsage}
        onCompactSession={agent.compactSession}
        agentStatus={agent.agentStatus}
        savedNoteTsSet={agent.savedNoteTsSet}
        onSaveToolCalls={agent.saveCommandNote}
        onRemoveToolCalls={agent.removeCommandNote}
        onSaveAnswer={agent.saveAnswerNote}
        onRemoveAnswer={agent.removeCommandNote}
        retryQuery={agent.retryQuery}
        rerouteQuery={agent.rerouteQuery}
        incognito={agent.incognito}
        setIncognito={agent.setIncognito}
        onToggleIncognito={agent.toggleIncognito}
        noHistory={agent.noHistory}
        notificationsEnabled={agent.notificationsEnabled}
        onToggleNotifications={agent.toggleNotifications}
        presets={agent.presets}
        availableSkills={agent.availableSkills}
        activeMode={agent.activeMode}
        uploadLimits={agent.uploadLimits}
        instructions={agent.instructions}
        onDeleteInstruction={agent.deleteInstruction}
        hasMoreMessages={agent.hasMoreMessages}
        loadingMore={agent.loadingMore}
        onLoadMore={agent.loadMoreMessages}
        canvasEnabled={agent.sessionInfo.canvas_enabled ?? false}
        providers={agent.providers}
        selectedProvider={agent.selectedProvider}
        onProviderChange={agent.setSelectedProvider}
        sessionProviderOverride={agent.sessionInfo?.provider_override ?? null}
      />
    </div>
  );
}
