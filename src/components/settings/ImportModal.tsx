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

  const handleBrowse = async () => {
    if (busy) return;
    const result = await openDialog(
      kind === "skill"
        ? { directory: true, multiple: false }
        : {
            directory: false,
            multiple: false,
            filters: [{ name: "Markdown", extensions: ["md"] }],
          },
    );
    if (result === null) return;
    const path = typeof result === "string" ? result : result[0];
    if (!path) return;
    setStagedPath(path);
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
              <p className="import-dropzone-text">
                {kind === "agent"
                  ? "Drop a .md file here"
                  : "Drop a skill folder here"}
              </p>
              <p className="import-dropzone-or">or</p>
              <button
                type="button"
                className="import-button"
                onClick={handleBrowse}
                disabled={busy}
              >
                Browse...
              </button>
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
              <button
                type="button"
                className="import-button"
                onClick={handleBrowse}
                disabled={busy}
              >
                Browse...
              </button>
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
