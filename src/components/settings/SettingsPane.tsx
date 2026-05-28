import { useEffect, useState } from "react";
import type {
  ExtensionEntry,
  ExtensionKind,
  ResolveMode,
} from "../../types/extension";
import { useToast } from "../../context/ToastContext";
import {
  AgentExistsError,
  deleteAgent,
  importAgent,
  listAgents,
  readAgent,
} from "../../lib/agents";
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

type PendingImport = {
  kind: ExtensionKind;
  srcPath: string;
};

type Selected = {
  kind: ExtensionKind;
  name: string;
  content: string;
};

function basenameWithoutExt(srcPath: string, kind: ExtensionKind): string {
  const segments = srcPath.split(/[/\\]/).filter((s) => s !== "");
  const last = segments[segments.length - 1] ?? "";
  if (kind === "agent" && last.endsWith(".md")) {
    return last.slice(0, -3);
  }
  return last;
}

export function SettingsPane() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ExtensionKind>("skill");
  const [skills, setSkills] = useState<ExtensionEntry[]>([
    { kind: "skill", name: "example-skill", enabled: true },
  ]);
  const [agents, setAgents] = useState<ExtensionEntry[]>([]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await listAgents();
        setAgents(loaded);
      } catch (e) {
        showToast("error", `Failed to load agents: ${String(e)}`);
      }
    })();
  }, [showToast]);

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

  const handleDeleteConfirm = async () => {
    if (pendingDelete === null) {
      return;
    }
    const { kind, name } = pendingDelete;
    try {
      if (kind === "agent") {
        await deleteAgent(name);
      }
      setEntriesFor(
        kind,
        entriesFor(kind).filter((entry) => entry.name !== name),
      );
      showToast("success", `Deleted ${kind} "${name}"`);
    } catch (e) {
      showToast("error", `Failed to delete ${kind} "${name}": ${String(e)}`);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleImport = (kind: ExtensionKind) => async (srcPath: string) => {
    if (kind === "skill") {
      const name = basenameWithoutExt(srcPath, kind);
      if (name === "") {
        return;
      }
      const exists = entriesFor(kind).some((entry) => entry.name === name);
      if (exists) {
        setPendingImport({ kind, srcPath });
        setConflict({ kind, existingName: name });
        return;
      }
      setEntriesFor(kind, [
        ...entriesFor(kind),
        { kind, name, enabled: true },
      ]);
      showToast("success", `Imported ${kind} "${name}"`);
      return;
    }

    try {
      const entry = await importAgent(srcPath, { mode: "fail" });
      setEntriesFor(kind, [...entriesFor(kind), entry]);
      showToast("success", `Imported ${kind} "${entry.name}"`);
    } catch (e) {
      if (e instanceof AgentExistsError) {
        setPendingImport({ kind, srcPath });
        setConflict({ kind, existingName: e.name });
        return;
      }
      showToast("error", `Import failed: ${String(e)}`);
    }
  };

  const handleResolve = async (mode: ResolveMode, newName?: string) => {
    if (conflict === null || pendingImport === null) {
      return;
    }
    const { kind, existingName } = conflict;
    const { srcPath } = pendingImport;
    const current = entriesFor(kind);

    if (mode === "skip") {
      setConflict(null);
      setPendingImport(null);
      showToast("info", `Skipped ${kind} "${existingName}"`);
      return;
    }

    if (kind === "skill") {
      if (mode === "overwrite") {
        setEntriesFor(
          kind,
          current.map((entry) =>
            entry.name === existingName ? { ...entry, enabled: true } : entry,
          ),
        );
        setConflict(null);
        setPendingImport(null);
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
        setPendingImport(null);
        showToast("success", `Imported ${kind} "${newName}"`);
      }
      return;
    }

    try {
      if (mode === "overwrite") {
        const entry = await importAgent(srcPath, { mode: "overwrite" });
        setEntriesFor(
          kind,
          current.map((e) => (e.name === entry.name ? entry : e)),
        );
        setConflict(null);
        setPendingImport(null);
        showToast("success", `Overwrote ${kind} "${entry.name}"`);
        return;
      }
      if (mode === "rename" && newName) {
        const entry = await importAgent(srcPath, { mode: "rename", newName });
        setEntriesFor(kind, [...current, entry]);
        setConflict(null);
        setPendingImport(null);
        showToast("success", `Imported ${kind} "${entry.name}"`);
      }
    } catch (e) {
      if (e instanceof AgentExistsError) {
        setConflict({ kind, existingName: e.name });
        return;
      }
      showToast("error", `Failed: ${String(e)}`);
    }
  };

  const handleSelect = (kind: ExtensionKind) => async (name: string) => {
    if (kind === "agent") {
      try {
        const content = await readAgent(name);
        setSelected({ kind, name, content });
      } catch (e) {
        showToast("error", `Failed to read agent "${name}": ${String(e)}`);
      }
      return;
    }
    setSelected({ kind, name, content: mockSkillContent(name) });
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
          onCancel={() => {
            setConflict(null);
            setPendingImport(null);
          }}
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
          content={selected.content}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function mockSkillContent(name: string): string {
  return `---
name: ${name}
description: (mock content)
---

# ${name}

This is a mock SKILL.md preview.
Real content will be loaded from ~/.servantpack/.claude/skills/${name}/SKILL.md.
`;
}
