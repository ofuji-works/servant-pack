import type { ExtensionKind } from "../../types/extension";

type Props = {
  kind: ExtensionKind;
  onClick: () => void;
};

export function ImportButton({ kind, onClick }: Props) {
  return (
    <button type="button" className="import-button" onClick={onClick}>
      Import {kind}
    </button>
  );
}
