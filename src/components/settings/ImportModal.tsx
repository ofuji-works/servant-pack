import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { ExtensionKind } from "../../types/extension";

type Props = {
  kind: ExtensionKind;
  onImport: (srcPath: string) => Promise<void> | void;
  onClose: () => void;
};

function basename(path: string): string {
  const segments = path.split(/[/\\]/).filter((s) => s !== "");
  return segments[segments.length - 1] ?? path;
}

export function ImportModal({ kind, onImport, onClose }: Props) {
  const [stagedPath, setStagedPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const acceptablePath = (path: string): boolean => {
    if (kind === "agent") {
      return path.toLowerCase().endsWith(".md");
    }
    return true;
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const u = await getCurrentWebview().onDragDropEvent((event) => {
        if (cancelled) return;
        const payload = event.payload;
        if (payload.type === "enter" || payload.type === "over") {
          setIsDragging(true);
        } else if (payload.type === "leave") {
          setIsDragging(false);
        } else if (payload.type === "drop") {
          setIsDragging(false);
          const first = payload.paths.find(acceptablePath);
          if (first !== undefined) {
            setStagedPath(first);
          }
        }
      });
      if (cancelled) {
        u();
      } else {
        unlisten = u;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const browseAgent = async () => {
    const result = await openDialog({
      directory: false,
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    pickResult(result);
  };

  const browseSkillZip = async () => {
    const result = await openDialog({
      directory: false,
      multiple: false,
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
    pickResult(result);
  };

  const browseSkillFolder = async () => {
    const result = await openDialog({ directory: true, multiple: false });
    pickResult(result);
  };

  const pickResult = (result: string | string[] | null) => {
    if (result === null) return;
    const path = typeof result === "string" ? result : result[0];
    if (path) {
      setStagedPath(path);
    }
  };

  const handleConfirm = async () => {
    if (busy || stagedPath === null) return;
    setBusy(true);
    try {
      await onImport(stagedPath);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    if (busy) return;
    setStagedPath(null);
  };

  const dropHint =
    kind === "agent"
      ? "Drop a .md file here"
      : "Drop a .zip file or a folder here";

  return (
    <div className="detail-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="detail-dialog import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-header">
          <div className="detail-title-group">
            <span className={`detail-kind detail-kind-${kind}`}>{kind}</span>
            <h3 className="detail-title">Import {kind}</h3>
          </div>
          <button
            type="button"
            className="detail-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className={
            isDragging
              ? "import-dropzone import-dropzone-active"
              : "import-dropzone"
          }
        >
          {stagedPath === null ? (
            <>
              <p className="import-dropzone-text">{dropHint}</p>
              <p className="import-dropzone-or">or</p>
              {kind === "agent" ? (
                <button
                  type="button"
                  className="import-button"
                  onClick={browseAgent}
                  disabled={busy}
                >
                  Browse...
                </button>
              ) : (
                <div className="import-browse-group">
                  <button
                    type="button"
                    className="import-button"
                    onClick={browseSkillZip}
                    disabled={busy}
                  >
                    Browse zip...
                  </button>
                  <button
                    type="button"
                    className="import-button"
                    onClick={browseSkillFolder}
                    disabled={busy}
                  >
                    Browse folder...
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="import-staged" title={stagedPath}>
                <span className="import-staged-icon" aria-hidden>
                  📄
                </span>
                <span className="import-staged-name">
                  {basename(stagedPath)}
                </span>
                <button
                  type="button"
                  className="import-staged-clear"
                  onClick={handleClear}
                  disabled={busy}
                  aria-label="Clear selection"
                >
                  ×
                </button>
              </div>
              <p className="import-dropzone-or">
                Drop another file or browse to replace
              </p>
              {kind === "agent" ? (
                <button
                  type="button"
                  className="import-button"
                  onClick={browseAgent}
                  disabled={busy}
                >
                  Browse...
                </button>
              ) : (
                <div className="import-browse-group">
                  <button
                    type="button"
                    className="import-button"
                    onClick={browseSkillZip}
                    disabled={busy}
                  >
                    Browse zip...
                  </button>
                  <button
                    type="button"
                    className="import-button"
                    onClick={browseSkillFolder}
                    disabled={busy}
                  >
                    Browse folder...
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="import-footer">
          <button
            type="button"
            className="import-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="import-confirm"
            onClick={handleConfirm}
            disabled={busy || stagedPath === null}
          >
            {busy ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
