import { homeDir, join } from "@tauri-apps/api/path";
import {
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
} from "@tauri-apps/plugin-fs";
import type { ExtensionEntry } from "../types/extension";

const AGENTS_SUBPATH = ".servantpack/.claude/agents";
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export type ImportMode =
  | { mode: "fail" }
  | { mode: "overwrite" }
  | { mode: "rename"; newName: string };

export class AgentExistsError extends Error {
  constructor(public readonly name: string) {
    super(`agent "${name}" already exists`);
    this.name = "AgentExistsError";
  }
}

export class InvalidAgentNameError extends Error {
  constructor(public readonly attemptedName: string) {
    super(`invalid agent name "${attemptedName}" (allowed: [A-Za-z0-9_-]+)`);
    this.name = "InvalidAgentNameError";
  }
}

async function agentsDir(): Promise<string> {
  const dir = await join(await homeDir(), AGENTS_SUBPATH);
  await mkdir(dir, { recursive: true });
  return dir;
}

function deriveName(srcPath: string): string {
  const segments = srcPath.split(/[/\\]/).filter((s) => s !== "");
  const last = segments[segments.length - 1] ?? "";
  return last.endsWith(".md") ? last.slice(0, -3) : last;
}

function validateName(name: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new InvalidAgentNameError(name);
  }
}

export async function listAgents(): Promise<ExtensionEntry[]> {
  const dir = await agentsDir();
  const entries = await readDir(dir);
  return entries
    .filter((e) => e.isFile && e.name.endsWith(".md"))
    .map((e) => ({
      kind: "agent" as const,
      name: e.name.slice(0, -3),
      enabled: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function importAgent(
  srcPath: string,
  opts: ImportMode,
): Promise<ExtensionEntry> {
  const name = opts.mode === "rename" ? opts.newName : deriveName(srcPath);
  validateName(name);

  const dir = await agentsDir();
  const destPath = await join(dir, `${name}.md`);
  const alreadyExists = await exists(destPath);

  if (alreadyExists && opts.mode === "fail") {
    throw new AgentExistsError(name);
  }
  if (alreadyExists && opts.mode === "rename") {
    throw new AgentExistsError(name);
  }
  if (alreadyExists && opts.mode === "overwrite") {
    await remove(destPath);
  }

  await copyFile(srcPath, destPath);
  return { kind: "agent", name, enabled: true };
}

export async function deleteAgent(name: string): Promise<void> {
  validateName(name);
  const dir = await agentsDir();
  await remove(await join(dir, `${name}.md`));
}

export async function readAgent(name: string): Promise<string> {
  validateName(name);
  const dir = await agentsDir();
  return readTextFile(await join(dir, `${name}.md`));
}
