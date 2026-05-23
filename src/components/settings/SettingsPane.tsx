import { useState } from "react";
import type {
  ExtensionEntry,
  ExtensionKind,
  ResolveMode,
} from "../../types/extension";
import { ExtensionList } from "./ExtensionList";
import { ImportButton } from "./ImportButton";
import { ConflictDialog } from "./ConflictDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

type Conflict = {
  kind: ExtensionKind;
  existingName: string;
};

type PendingDelete = {
  kind: ExtensionKind;
  name: string;
};

export function SettingsPane() {
  const [activeTab, setActiveTab] = useState<ExtensionKind>("skill");
  const [skills, setSkills] = useState<ExtensionEntry[]>([
    { kind: "skill", name: "example-skill", enabled: true },
  ]);
  const [agents, setAgents] = useState<ExtensionEntry[]>([
    { kind: "agent", name: "example-agent", enabled: true },
  ]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const entriesFor = (kind: ExtensionKind) =>
    kind === "skill" ? skills : agents;

  const setEntriesFor = (kind: ExtensionKind, next: ExtensionEntry[]) => {
    if (kind === "skill") {
      setSkills(next);
    } else {
      setAgents(next);
    }
  };

  const handleToggle = (kind: ExtensionKind) => (name: string) => {
    setEntriesFor(
      kind,
      entriesFor(kind).map((entry) =>
        entry.name === name ? { ...entry, enabled: !entry.enabled } : entry,
      ),
    );
  };

  const handleDelete = (kind: ExtensionKind) => (name: string) => {
    setPendingDelete({ kind, name });
  };

  const handleDeleteConfirm = () => {
    if (pendingDelete === null) {
      return;
    }
    const { kind, name } = pendingDelete;
    setEntriesFor(
      kind,
      entriesFor(kind).filter((entry) => entry.name !== name),
    );
    setPendingDelete(null);
  };

  const handleImport = (kind: ExtensionKind) => (name: string) => {
    const exists = entriesFor(kind).some((entry) => entry.name === name);
    if (exists) {
      setConflict({ kind, existingName: name });
      return;
    }
    setEntriesFor(kind, [
      ...entriesFor(kind),
      { kind, name, enabled: true },
    ]);
  };

  const handleResolve = (mode: ResolveMode, newName?: string) => {
    if (conflict === null) {
      return;
    }
    const { kind, existingName } = conflict;
    const current = entriesFor(kind);

    if (mode === "skip") {
      setConflict(null);
      return;
    }

    if (mode === "overwrite") {
      setEntriesFor(
        kind,
        current.map((entry) =>
          entry.name === existingName ? { ...entry, enabled: true } : entry,
        ),
      );
      setConflict(null);
      return;
    }

    if (mode === "rename" && newName) {
      const renameExists = current.some((entry) => entry.name === newName);
      if (renameExists) {
        setConflict({ kind, existingName: newName });
        return;
      }
      setEntriesFor(kind, [
        ...current,
        { kind, name: newName, enabled: true },
      ]);
      setConflict(null);
    }
  };

  return (
    <div className="settings-pane">
      <div className="settings-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "skill"}
          className={
            activeTab === "skill"
              ? "settings-tab settings-tab-active"
              : "settings-tab"
          }
          onClick={() => setActiveTab("skill")}
        >
          Skills
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "agent"}
          className={
            activeTab === "agent"
              ? "settings-tab settings-tab-active"
              : "settings-tab"
          }
          onClick={() => setActiveTab("agent")}
        >
          Agents
        </button>
      </div>

      <div className="settings-actions">
        <ImportButton kind={activeTab} onImport={handleImport(activeTab)} />
      </div>

      <div className="settings-body">
        <ExtensionList
          entries={entriesFor(activeTab)}
          emptyMessage={`No ${activeTab}s imported yet`}
          onToggle={handleToggle(activeTab)}
          onDelete={handleDelete(activeTab)}
        />
      </div>

      {conflict !== null && (
        <ConflictDialog
          name={conflict.existingName}
          onResolve={handleResolve}
          onCancel={() => setConflict(null)}
        />
      )}

      {pendingDelete !== null && (
        <DeleteConfirmDialog
          name={pendingDelete.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
