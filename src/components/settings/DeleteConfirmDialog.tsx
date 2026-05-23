import { useEffect } from "react";

type Props = {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmDialog({ name, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="conflict-overlay" onClick={onCancel}>
      <div className="conflict-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="conflict-title">Delete "{name}"?</h3>
        <p className="conflict-message">This action cannot be undone.</p>
        <div className="conflict-actions">
          <button type="button" className="conflict-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="conflict-button conflict-button-danger"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
