# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension (TypeScript) that colorizes editor lines based on `git blame` output. Supports three modes: per-author colors (deterministic hash), heat map (age-based gradient), and off.

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
3. `decorator.ts` receives blame data and applies `TextEditorDecorationType` background colors
4. Color is computed by either `colorGenerator.ts` (author mode) or `heatColorGenerator.ts` (heat mode)
5. A hover provider in `extension.ts` displays author, email, date, commit hash, and summary
6. `settingsPanel.ts` renders a Webview sidebar for interactive settings (mode, opacity, custom colors)

### Module Responsibilities

| File | Role |
|------|------|
| `src/extension.ts` | Entry point, command registration, VS Code event listeners |
| `src/gitBlame.ts` | Spawns `git blame`, parses `--line-porcelain` format |
| `src/decorator.ts` | Creates and applies `TextEditorDecorationType` per line |
| `src/configuration.ts` | Singleton wrapping `vscode.workspace.getConfiguration` |
| `src/colorGenerator.ts` | Hash-based deterministic author → HSL color |
| `src/heatColorGenerator.ts` | Interpolates between `heatColors.old/new` by commit age ratio |
| `src/settingsPanel.ts` | Webview sidebar with embedded HTML/JS for UI |

### Key Gotchas

- **Config proxy mutation**: `vscode.WorkspaceConfiguration` objects are read-only proxies. Always spread before modifying: `{ ...config.get('colors') }`.
- **Infinite loop guard**: Mode switching must check `currentMode` before reapplying, otherwise `onDidChangeConfiguration` triggers a loop.
- **Debouncing**: `onDidChangeTextDocument` fires on every keystroke — blame refresh is debounced 500 ms.
- **Single hover provider**: Only one hover provider is registered per session; it handles all lines internally.
- **Extension ID**: `gitBlameColor` (used in command IDs and configuration keys).
