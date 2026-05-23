import { useEffect } from "react";
import type { ExtensionKind } from "../../types/extension";

type Props = {
  kind: ExtensionKind;
  name: string;
  content: string;
  onClose: () => void;
};

export function DetailDialog({ kind, name, content, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="detail-title-group">
            <span className={`detail-kind detail-kind-${kind}`}>{kind}</span>
            <h3 className="detail-title">{name}</h3>
          </div>
          <button
            type="button"
            className="detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <pre className="detail-content">{content}</pre>
      </div>
    </div>
  );
}
