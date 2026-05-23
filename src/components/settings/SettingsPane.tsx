import { useState } from "react";
import type {
  ExtensionEntry,
  ExtensionKind,
  ResolveMode,
} from "../../types/extension";
import { useToast } from "../../context/ToastContext";
import { ExtensionList } from "./ExtensionList";
import { ImportButton } from "./ImportButton";
import { ConflictDialog } from "./ConflictDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { DetailDialog } from "./DetailDialog";

type Conflict = {
  kind: ExtensionKind;
  existingName: string;
};

type PendingDelete = {
  kind: ExtensionKind;
  name: string;
};

type Selected = {
  kind: ExtensionKind;
  name: string;
};

export function SettingsPane() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ExtensionKind>("skill");
  const [skills, setSkills] = useState<ExtensionEntry[]>([
    { kind: "skill", name: "example-skill", enabled: true },
  ]);
  const [agents, setAgents] = useState<ExtensionEntry[]>([
    { kind: "agent", name: "example-agent", enabled: true },
  ]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

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
    showToast("success", `Deleted ${kind} "${name}"`);
  };

  const handleImport = (kind: ExtensionKind) => async (name: string) => {
    const exists = entriesFor(kind).some((entry) => entry.name === name);
    if (exists) {
      setConflict({ kind, existingName: name });
      return;
    }
    setEntriesFor(kind, [
      ...entriesFor(kind),
      { kind, name, enabled: true },
    ]);
    showToast("success", `Imported ${kind} "${name}"`);
  };

  const handleResolve = (mode: ResolveMode, newName?: string) => {
    if (conflict === null) {
      return;
    }
    const { kind, existingName } = conflict;
    const current = entriesFor(kind);

    if (mode === "skip") {
      setConflict(null);
      showToast("info", `Skipped ${kind} "${existingName}"`);
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
      showToast("success", `Overwrote ${kind} "${existingName}"`);
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
      showToast("success", `Imported ${kind} "${newName}"`);
    }
  };

  const handleSelect = (kind: ExtensionKind) => (name: string) => {
    setSelected({ kind, name });
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
          onSelect={handleSelect(activeTab)}
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

      {selected !== null && (
        <DetailDialog
          kind={selected.kind}
          name={selected.name}
          content={mockContent(selected.kind, selected.name)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function mockContent(kind: ExtensionKind, name: string): string {
  if (kind === "skill") {
    return `---
name: ${name}
description: (mock content)
---

# ${name}

This is a mock SKILL.md preview.
Real content will be loaded from ~/.servantpack/.claude/skills/${name}/SKILL.md.
`;
  }
  return `---
name: ${name}
description: (mock content)
model: sonnet
---

This is a mock agent.md preview.
Real content will be loaded from ~/.servantpack/.claude/agents/${name}.md.
`;
}
