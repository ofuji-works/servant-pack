import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { ExtensionKind } from "../../types/extension";

type Props = {
  kind: ExtensionKind;
  onImport: (srcPath: string) => Promise<void> | void;
};

export function ImportButton({ kind, onImport }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const result = await open(
        kind === "skill"
          ? { directory: true, multiple: false }
          : {
              directory: false,
              multiple: false,
              filters: [{ name: "Markdown", extensions: ["md"] }],
            },
      );
      if (result === null) {
        return;
      }
      const path = typeof result === "string" ? result : result[0];
      if (!path) {
        return;
      }
      await onImport(path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="import-button"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Importing..." : `Import ${kind}`}
    </button>
  );
}
