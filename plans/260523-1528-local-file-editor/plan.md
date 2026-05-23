# ローカルファイル編集機能

`~/.servantpack/output/` 配下の Markdown ファイルを Obsidian 風 UI で編集できるようにする。

## ゴール

- 起動時に `~/.servantpack/output/` を必ず存在する状態にする
- 左サイドバーで `output/` 配下のファイル/フォルダをツリー表示し、右クリックで CRUD できる
- ツリーから開いたファイルはタブで複数並行編集できる
- 編集内容は debounce 500ms で自動保存される
- claude (PTY) など外部プロセスが `output/` を書き換えたら、ツリーと開いているタブに自動反映する

## 非ゴール

- `output/` 配下以外のファイル編集(セキュリティ上スコープ外、Rust 側で path 検証)
- `.md` 以外のファイル(将来 `@codemirror/language-data` で拡張可)
- タブ状態の永続化(再起動時に開き直す機能)
- Drag & Drop でのファイル移動
- 検索 / コマンドパレット

## 前提

- 既存の Tauri v2 + React + CodeMirror 構成を踏襲
- Rust 側は既存レイヤー (`application/` `domain/` `infrastruture/` `interface/`) に合わせる
- ファイル I/O は自前 Rust コマンドで実装(PTY と同じ流儀)
- 既存 PTY の `cwd` を `~/.servantpack` に変更し、claude を `~/.servantpack/` 起点で動かす

## アーキテクチャ

### UI レイヤー (3 ペイン)

```
+----------+----------------------+----------+
| FileTree |  [tab1] [tab2] [+]   | Terminal |
|          +----------------------+          |
| output/  |                      |          |
|  dir/    |  CodeMirror /        |  claude  |
|   f3.md  |  Preview             |          |
|  f1.md   |                      |          |
+----------+----------------------+----------+
```

- 既存 `SplitPane` をネストして 3 ペインを構成
- `FileTree` (新規): `output/` 配下のツリー描画、右クリックメニュー
- `EditorPane` (既存 `Editor` を分割再構成): タブ + CodeMirror/Preview
- `Terminal` (既存): 変更なし。ただし PTY 起動時の cwd 設定が変わる

### Rust 側コマンド

`application/fs.rs` (新規) に集約。`domain/output_path.rs` (新規) で `output/` 配下スコープ検証。

| コマンド | 役割 |
|---|---|
| `output_init` | `~/.servantpack/output/` を作成 (idempotent) |
| `output_list` | ツリー全体(再帰)を返す。`{ name, kind: file|dir, children?: [...] }` |
| `output_read` | 相対パスから内容読込 |
| `output_write` | 相対パスへ内容書込(自動保存で頻発) |
| `output_create` | 新規ファイル/フォルダ作成 |
| `output_rename` | リネーム |
| `output_delete` | 削除 |
| `output_watch_start` | `notify` で監視開始、`fs:changed` イベント emit |

すべて入力パスを `~/.servantpack/output/` 配下に正規化、それ以外は `Err` で弾く。

### イベント

- `fs:changed`: Rust → JS。`{ kind: created|modified|removed|renamed, path }`
- フロント側で受信し、ツリー再取得 + 該当タブのリロード(後述)

## 競合ハンドリング方針

自動保存中に外部書き換えが入る可能性があるため、以下のルールで扱う:

- **エディタが dirty** (= 直近の編集がまだ disk に反映前) かつ **外部 modify 通知**: 警告トーストを出し、リロードはしない(ユーザーが Reload を選べる)
- **エディタが clean** かつ **外部 modify 通知**: 自動でファイル内容を再読み込み、エディタを更新
- **削除通知**: 該当タブをクローズ、警告トースト
- **リネーム通知**: タブのパスを更新

`fs:changed` の自分起因イベント(自分の書き込みで発火)を抑制するため、書き込み前後で短い ignore window を持つ(実装は phase で詰める)。

## 追加依存

- Rust: `notify`(FS 監視), `dirs`(home 解決)
- TypeScript: なし(既存 CodeMirror 流用)

## フェーズ一覧

| フェーズ | 内容 |
|---|---|
| [phase-01](phase-01-rust-fs-foundation.md) | Rust 側 FS 基盤: `output_init` / `output_path` 検証 / I/O コマンド一式 |
| [phase-02](phase-02-pty-cwd.md) | PTY の cwd を `~/.servantpack` に変更 |
| [phase-03](phase-03-rust-fs-watch.md) | `notify` で `output/` 配下を監視、`fs:changed` イベント emit |
| [phase-04](phase-04-ui-layout-3pane.md) | UI を 3 ペイン化、`FileTree` 雛形配置 |
| [phase-05](phase-05-file-tree.md) | `FileTree` 実装: 一覧表示、フォルダ展開、選択 |
| [phase-06](phase-06-tabs-editor.md) | タブ + Editor 統合: 開いてるファイルの状態管理、切替、自動保存 |
| [phase-07](phase-07-context-menu.md) | 右クリックメニュー: New / Rename / Delete |
| [phase-08](phase-08-external-changes.md) | 外部変更のハンドリング: ツリー更新、開いているタブのリロード/警告 |

## 検証観点 (各フェーズ共通)

- `cargo check` / `pnpm build` がパスする
- `pnpm tauri dev` で起動して機能が動作する
- `~/.servantpack/output/` 配下のみ I/O が走る(`../` などで脱出できない)

## 機密配慮

- `~/.servantpack/output/` 配下は **ユーザーのローカルファイル**。外部 LLM / web 検索に内容を再送しない
- Rust コマンドは AppHandle 経由のみで呼ばれる(外部から直接叩けない)
