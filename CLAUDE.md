# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension (TypeScript) that annotates editor lines with inline `git blame` text. Supports three modes: per-author colors (deterministic hash), heat map (age-based gradient), and off. Decorations appear as inline text after the source code, not as background highlights.

## Commands

```sh
npm install           # Install dependencies
npm run compile       # Compile TypeScript → out/
npm run watch         # Watch mode during development
npm run make-extension # Compile + package as git-blame-color-0.0.1.vsix
```

**Debugging in VS Code**: Press `F5` to launch the Extension Development Host.

There are no tests or linters configured.

## Architecture

### Data Flow

1. File opened → `extension.ts` calls `applyBlameToEditor()`
2. `gitBlame.ts` runs `git blame --line-porcelain` and parses its output into `BlameResult`
3. `extension.ts` calls `config.ensureEmailColors()` to auto-register new email addresses
4. `decorator.ts` receives blame data and applies inline `after` text decorations per line group
5. Text color is computed by either `colorGenerator.ts` (author mode) or `heatColorGenerator.ts` (heat mode)
6. A hover provider in `decorator.ts` shows author, email, date, commit hash, summary, file history, and GitHub/GitLab links
7. `settingsPanel.ts` renders a Webview sidebar for interactive settings (mode, author colors, heat colors)

### Module Responsibilities

| File | Role |
|------|------|
| `src/extension.ts` | Entry point, command registration, VS Code event listeners |
| `src/gitBlame.ts` | Spawns `git blame`, parses `--line-porcelain` format; also fetches remote URL, default branch, file commit log |
| `src/decorator.ts` | Creates inline `after` decorations; registers and manages the single hover provider; caches remote URLs, branch, and file log per editor |
| `src/configuration.ts` | Singleton wrapping `vscode.workspace.getConfiguration`; colors keyed by email |
| `src/colorGenerator.ts` | Hash-based deterministic author → HSL color |
| `src/heatColorGenerator.ts` | Interpolates between `heatColors.old/new` by commit age ratio |
| `src/settingsPanel.ts` | Webview sidebar with embedded HTML/JS for mode, author colors, heat colors |

### Key Gotchas

- **Inline text, not background**: Decorations use `vscode.TextEditorDecorationType.after` to append text after the source line. Color is the text color. The label shows `date  author  summary`.
- **Colors keyed by email**: `configuration.ts` stores and looks up colors by email address, not display name. `ensureEmailColors()` auto-creates a hash-derived entry for every new email on blame load.
- **Config proxy mutation**: `vscode.WorkspaceConfiguration` objects are read-only proxies. Always spread before modifying: `{ ...config.get('colors') }`.
- **Infinite loop guard**: `settingsPanel.ts` guards `setMode()` with `if (mode === currentMode) return;` — without this, `onDidChangeConfiguration` would loop.
- **Debouncing**: `onDidChangeTextDocument` fires on every keystroke — blame refresh is debounced 500 ms.
- **Single hover provider**: Registered once in `Decorator` constructor for `{ scheme: "file" }`. Hover only triggers when cursor is **after** the raw source text (position ≥ `rawLen`), not over the code itself.
- **Tab-aware alignment**: Both decoration modes compute visual line length tab-by-tab so the inline labels align correctly regardless of tab size.
- **Caches per editor URI**: `remoteWebUrls`, `defaultBranchCache`, and `fileLogCache` in `Decorator` are populated lazily (async, non-blocking) on first decoration of each file.
- **Extension ID**: `gitBlameColor` (used in command IDs and configuration keys).

### Commands

| Command ID | Title | Description |
|------------|-------|-------------|
| `gitBlameColor.toggle` | Toggle Git Blame Color | Enable/disable inline annotations |
| `gitBlameColor.show` | Show Git Blame Colors | List authors and their colors for the active file |
| `gitBlameColor.compareFrom` | Git Blame Color: Commit vergleichen | Compare a specific commit against another (used from hover links) |
| `gitBlameColor.showHistory` | (internal) | Pick two commits from file history and diff them |
