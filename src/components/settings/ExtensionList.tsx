import type { ExtensionEntry } from "../../types/extension";

type Props = {
  entries: ExtensionEntry[];
  emptyMessage: string;
  onToggle: (name: string) => void;
  onDelete: (name: string) => void;
};

export function ExtensionList({ entries, emptyMessage, onToggle, onDelete }: Props) {
  if (entries.length === 0) {
    return <p className="extension-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="extension-list">
      {entries.map((entry) => (
        <li key={entry.name} className="extension-row">
          <span className="extension-name">{entry.name}</span>
          <label className="extension-toggle">
            <input
              type="checkbox"
              checked={entry.enabled}
              onChange={() => onToggle(entry.name)}
            />
            <span>{entry.enabled ? "enabled" : "disabled"}</span>
          </label>
          <button
            type="button"
            className="extension-delete"
            onClick={() => onDelete(entry.name)}
            aria-label={`Delete ${entry.name}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
