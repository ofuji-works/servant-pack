export type ExtensionKind = "skill" | "agent";

export type ExtensionEntry = {
  kind: ExtensionKind;
  name: string;
  enabled: boolean;
};

export type ResolveMode = "overwrite" | "skip" | "rename";
