# AGENTS.md — git-blame-color

## Build & run

```sh
npm install
npm run compile    # tsc -p ./
```

Debug: open in VS Code, press `F5` (Extension Development Host).

## Architecture

- **`src/extension.ts`** — entry point. Registers commands (`toggle`, `show`, `compareFrom`, `showHistory`), event listeners, and the `SettingsPanel` WebviewViewProvider. On activation, checks `config.isEnabled()` and applies decorations to all visible editors.
- **`src/gitBlame.ts`** — runs `git blame --line-porcelain`, parses output into `BlameLine[]`. Also provides: `getRemoteUrl()` (reads `git remote get-url origin`), `remoteToWebUrl()` (normalises SSH/HTTPS to `https://host/path`), `getDefaultBranch()` (resolves `origin/HEAD` or falls back to `main`/`master`), `getFileLog()` (runs `git log --follow`). Exports interfaces `BlameResult`, `BlameLine`, `CommitInfo`.
- **`src/decorator.ts`** — applies inline `after` decorations (text color, not background). Groups lines by `commitHash:visualLength` key so all lines of a commit at the same indent share one `TextEditorDecorationType`. Registers the single hover provider. Caches `remoteWebUrls`, `defaultBranchCache`, `fileLogCache` per editor URI (lazily, non-blocking).
- **`src/colorGenerator.ts`** — deterministic HSL hash → hex for author colors; also exports `hexToRgba()`.
- **`src/heatColorGenerator.ts`** — linear interpolation between old/new hex colors by normalized timestamp; exports `interpolateColor()` and `computeHeatRatio()`.
- **`src/configuration.ts`** — singleton, wraps `vscode.workspace.getConfiguration('gitBlameColor')`. Colors are **keyed by email address**. `ensureEmailColors(emails)` auto-creates hash-derived entries for new emails and persists them to workspace settings.
- **`src/settingsPanel.ts`** — WebviewViewProvider for the Activity Bar sidebar. Handles messages: `getSettings`, `setMode`, `saveColor`, `removeColor`, `setHeatColor`.

## Commands

| ID | Title |
|----|-------|
| `gitBlameColor.toggle` | Toggle Git Blame Color |
| `gitBlameColor.show` | Show Git Blame Colors |
| `gitBlameColor.compareFrom` | Git Blame Color: Commit vergleichen (called from hover links) |
| `gitBlameColor.showHistory` | (internal) Pick two commits from file history to diff |

## Hover behavior

The hover provider fires for `{ scheme: "file" }`. It only returns a hover when `position.character >= rawLen` (i.e., cursor is over the inline annotation, not the source code). The hover shows:
- Author + email
- Date + commit hash (7 chars)
- Commit summary
- Last 10 commits for the file as clickable links (fires `compareFrom`)
- GitHub/GitLab commit and project links (if a remote is configured)

## Gotchas

- **Inline text, not background** — decorations use `.after.contentText` and `.after.color`. There is no background color or opacity setting.
- **Colors keyed by email** — `configuration.ts` stores and reads colors by email, not display name. Direct name lookups will always miss.
- **Auto-registration of email colors** — `extension.ts` calls `config.ensureEmailColors(emails)` before decorating. This writes new entries to workspace settings and triggers `onDidChangeConfiguration`.
- **Config proxy mutation** — `config.get()` returns a VS Code proxy. Always `const x = { ...config.get(...) }` before mutation.
- **Mode switch loop** — Setting mode from the Webview triggers `onDidChangeConfiguration`, which re-sends settings back. The Webview's `setMode()` guards with `if (mode === currentMode) return;`.
- **`onDidChangeTextDocument` debounce** — fires on every keystroke. Blame refresh is debounced at 500 ms.
- **Single hover provider** — exactly one `registerHoverProvider` at construction of `Decorator`, backed by `hoverData: Map<uri, Map<line, HoverLineData>>`.
- **Tab-aware visual length** — both `applyAuthorDecoration` and `applyHeatDecoration` compute visual line length character-by-character (tabs expand to next tab stop) to align inline labels.
- **Lazy cache population** — `remoteWebUrls`, `defaultBranchCache`, `fileLogCache` are populated async (not awaited) on first decoration of a file. Hover falls back to `null`/`"main"`/`[]` if not yet populated.
- **No tests, no linter, no formatter config** in this repo.
- Output dir `out/` and `*.vsix` are gitignored + `.vscodeignore`d.
