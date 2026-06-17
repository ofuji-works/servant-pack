import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from "@tauri-apps/api/path";
import {
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename,
  stat,
} from "@tauri-apps/plugin-fs";
import type { ExtensionEntry } from "../types/extension";

const SKILLS_SUBPATH = ".servantpack/.claude/skills";
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
// Staging dirs must NOT be dotfiles: on Unix the fs capability glob defaults to
// require_literal_leading_dot=true, so `skills/*` would not match a `.tmp-*` dir
// and every staging fs op (mkdir/copy/rename/remove) would be forbidden.
const STAGING_PREFIX = "tmp-import-";

export type ImportMode =
  | { mode: "fail" }
  | { mode: "overwrite" }
  | { mode: "rename"; newName: string };

export class SkillExistsError extends Error {
  constructor(public readonly skillName: string) {
    super(`skill "${skillName}" already exists`);
    this.name = "SkillExistsError";
  }
}

export class InvalidSkillNameError extends Error {
  constructor(public readonly attemptedName: string) {
    super(`invalid skill name "${attemptedName}" (allowed: [A-Za-z0-9_-]+)`);
    this.name = "InvalidSkillNameError";
  }
}

export class SkillMdMissingError extends Error {
  constructor() {
    super("SKILL.md not found in the imported skill (root or one level deep)");
    this.name = "SkillMdMissingError";
  }
}

type ExtractZipError = {
  code:
    | "invalid_zip"
    | "path_traversal"
    | "size_limit"
    | "file_count_limit"
    | "io_error"
    | "dest_not_found";
  message: string;
};

async function skillsDir(): Promise<string> {
  const dir = await join(await homeDir(), SKILLS_SUBPATH);
  await mkdir(dir, { recursive: true });
  return dir;
}

function basename(p: string): string {
  const segments = p.split(/[/\\]/).filter((s) => s !== "");
  return segments[segments.length - 1] ?? p;
}

function stripExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function parseFrontmatterName(content: string): string | null {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      break;
    }
    const m = lines[i].match(/^name:\s*(.+?)\s*$/);
    if (m) {
      return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function validateName(name: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new InvalidSkillNameError(name);
  }
}

async function findSkillRoot(dir: string): Promise<string | null> {
  const rootSkillMd = await join(dir, "SKILL.md");
  if (await exists(rootSkillMd)) {
    return dir;
  }
  const entries = await readDir(dir);
  for (const e of entries) {
    if (!e.isDirectory) {
      continue;
    }
    const candidate = await join(dir, e.name);
    const skillMd = await join(candidate, "SKILL.md");
    if (await exists(skillMd)) {
      return candidate;
    }
  }
  return null;
}

async function copyDirRecursive(src: string, dst: string): Promise<void> {
  await mkdir(dst, { recursive: true });
  const entries = await readDir(src);
  for (const e of entries) {
    if (e.name.startsWith(".")) {
      continue;
    }
    const srcPath = await join(src, e.name);
    const dstPath = await join(dst, e.name);
    if (e.isDirectory) {
      await copyDirRecursive(srcPath, dstPath);
    } else if (e.isFile) {
      await copyFile(srcPath, dstPath);
    }
  }
}

async function removeRecursive(path: string): Promise<void> {
  if (!(await exists(path))) {
    return;
  }
  await remove(path, { recursive: true });
}

function randomTmpName(): string {
  return `${STAGING_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listSkills(): Promise<ExtensionEntry[]> {
  const dir = await skillsDir();
  const entries = await readDir(dir);
  return entries
    .filter(
      (e) =>
        e.isDirectory &&
        !e.name.startsWith(".") &&
        !e.name.startsWith(STAGING_PREFIX),
    )
    .map((e) => ({
      kind: "skill" as const,
      name: e.name,
      enabled: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteSkill(name: string): Promise<void> {
  validateName(name);
  const dir = await skillsDir();
  await removeRecursive(await join(dir, name));
}

export async function readSkill(name: string): Promise<string> {
  validateName(name);
  const dir = await skillsDir();
  return readTextFile(await join(dir, name, "SKILL.md"));
}

export async function importSkill(
  srcPath: string,
  opts: ImportMode,
): Promise<ExtensionEntry> {
  const skills = await skillsDir();
  const stagingDir = await join(skills, randomTmpName());
  await mkdir(stagingDir, { recursive: true });

  try {
    // Branch on what the source actually is, not its extension: skills ship as
    // a folder or as an archive that may carry a `.zip` or `.skill` extension
    // (both are plain zip files). The Rust extractor validates the zip magic
    // and reports `invalid_zip` for anything that isn't a real archive.
    const srcIsDirectory = (await stat(srcPath)).isDirectory;
    if (srcIsDirectory) {
      await copyDirRecursive(srcPath, stagingDir);
    } else {
      try {
        await invoke("extract_zip", {
          zipPath: srcPath,
          destDir: stagingDir,
        });
      } catch (e) {
        const err = e as Partial<ExtractZipError>;
        throw new Error(
          `zip extract failed (${err.code ?? "unknown"}): ${err.message ?? String(e)}`,
        );
      }
    }

    const skillRoot = await findSkillRoot(stagingDir);
    if (skillRoot === null) {
      throw new SkillMdMissingError();
    }

    let name: string;
    if (opts.mode === "rename") {
      name = opts.newName;
    } else {
      const content = await readTextFile(await join(skillRoot, "SKILL.md"));
      const fromFrontmatter = parseFrontmatterName(content);
      name = fromFrontmatter ?? stripExt(basename(srcPath));
    }
    validateName(name);

    const finalDest = await join(skills, name);
    const alreadyExists = await exists(finalDest);

    if (alreadyExists && (opts.mode === "fail" || opts.mode === "rename")) {
      throw new SkillExistsError(name);
    }
    if (alreadyExists && opts.mode === "overwrite") {
      await removeRecursive(finalDest);
    }

    if (skillRoot === stagingDir) {
      await rename(stagingDir, finalDest);
    } else {
      await rename(skillRoot, finalDest);
      await removeRecursive(stagingDir);
    }

    return { kind: "skill", name, enabled: true };
  } catch (e) {
    try {
      await removeRecursive(stagingDir);
    } catch {
      // swallow cleanup errors
    }
    throw e;
  }
}
