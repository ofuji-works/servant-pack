import type { ExtensionKind } from "../../types/extension";

type Props = {
  kind: ExtensionKind;
  onImport: (name: string) => void;
};

export function ImportButton({ kind, onImport }: Props) {
  const handleClick = () => {
    const input = window.prompt(`Import ${kind} (mock: enter a name)`);
    if (input === null) {
      return;
    }
    const name = input.trim();
    if (name === "") {
      return;
    }
    onImport(name);
  };

  return (
    <button type="button" className="import-button" onClick={handleClick}>
      Import {kind}
    </button>
  );
}
