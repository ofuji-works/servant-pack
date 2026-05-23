import { useEffect, useState } from "react";
import type { ResolveMode } from "../../types/extension";

type Props = {
  name: string;
  onResolve: (mode: ResolveMode, newName?: string) => void;
  onCancel: () => void;
};

export function ConflictDialog({ name, onResolve, onCancel }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleRenameConfirm = () => {
    const trimmed = newName.trim();
    if (trimmed === "") {
      return;
    }
    onResolve("rename", trimmed);
  };

  return (
    <div className="conflict-overlay" onClick={onCancel}>
      <div className="conflict-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="conflict-title">"{name}" already exists</h3>
        <p className="conflict-message">How do you want to resolve this?</p>

        {!renaming ? (
          <div className="conflict-actions">
            <button
              type="button"
              className="conflict-button"
              onClick={() => onResolve("overwrite")}
            >
              Overwrite
            </button>
            <button
              type="button"
              className="conflict-button"
              onClick={() => onResolve("skip")}
            >
              Skip
            </button>
            <button
              type="button"
              className="conflict-button"
              onClick={() => setRenaming(true)}
            >
              Rename
            </button>
          </div>
        ) : (
          <div className="conflict-rename">
            <input
              type="text"
              className="conflict-rename-input"
              placeholder="New name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="conflict-actions">
              <button
                type="button"
                className="conflict-button"
                onClick={() => setRenaming(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="conflict-button conflict-button-primary"
                onClick={handleRenameConfirm}
                disabled={newName.trim() === ""}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
