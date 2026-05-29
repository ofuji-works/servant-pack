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
import {
  SkillExistsError,
  SkillMdMissingError,
  deleteSkill,
  importSkill,
  listSkills,
  readSkill,
} from "../../lib/skills";
import { ExtensionList } from "./ExtensionList";
import { ImportButton } from "./ImportButton";
import { ImportModal } from "./ImportModal";
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

export function SettingsPane() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ExtensionKind>("skill");
  const [skills, setSkills] = useState<ExtensionEntry[]>([]);
  const [agents, setAgents] = useState<ExtensionEntry[]>([]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [loadedAgents, loadedSkills] = await Promise.all([
          listAgents(),
          listSkills(),
        ]);
        setAgents(loadedAgents);
        setSkills(loadedSkills);
      } catch (e) {
        showToast("error", `Failed to load extensions: ${String(e)}`);
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
      } else {
        await deleteSkill(name);
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
    try {
      const entry =
        kind === "agent"
          ? await importAgent(srcPath, { mode: "fail" })
          : await importSkill(srcPath, { mode: "fail" });
      setEntriesFor(
        kind,
        [...entriesFor(kind), entry].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      showToast("success", `Imported ${kind} "${entry.name}"`);
    } catch (e) {
      if (e instanceof AgentExistsError || e instanceof SkillExistsError) {
        const existingName =
          e instanceof AgentExistsError ? e.name : e.skillName;
        setPendingImport({ kind, srcPath });
        setConflict({ kind, existingName });
        return;
      }
      if (e instanceof SkillMdMissingError) {
        showToast("error", `Import failed: SKILL.md not found`);
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

    try {
      const entry =
        mode === "overwrite"
          ? kind === "agent"
            ? await importAgent(srcPath, { mode: "overwrite" })
            : await importSkill(srcPath, { mode: "overwrite" })
          : kind === "agent"
            ? await importAgent(srcPath, {
                mode: "rename",
                newName: newName ?? "",
              })
            : await importSkill(srcPath, {
                mode: "rename",
                newName: newName ?? "",
              });

      if (mode === "overwrite") {
        setEntriesFor(
          kind,
          current.map((e) => (e.name === entry.name ? entry : e)),
        );
        setConflict(null);
        setPendingImport(null);
        showToast("success", `Overwrote ${kind} "${entry.name}"`);
        return;
      }

      setEntriesFor(
        kind,
        [...current, entry].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setConflict(null);
      setPendingImport(null);
      showToast("success", `Imported ${kind} "${entry.name}"`);
    } catch (e) {
      if (e instanceof AgentExistsError || e instanceof SkillExistsError) {
        const existingName =
          e instanceof AgentExistsError ? e.name : e.skillName;
        setConflict({ kind, existingName });
        return;
      }
      showToast("error", `Failed: ${String(e)}`);
    }
  };

  const handleSelect = (kind: ExtensionKind) => async (name: string) => {
    try {
      const content =
        kind === "agent" ? await readAgent(name) : await readSkill(name);
      setSelected({ kind, name, content });
    } catch (e) {
      showToast("error", `Failed to read ${kind} "${name}": ${String(e)}`);
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
        <ImportButton
          kind={activeTab}
          onClick={() => setImportModalOpen(true)}
        />
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

      {importModalOpen && (
        <ImportModal
          kind={activeTab}
          onImport={handleImport(activeTab)}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  );
}
