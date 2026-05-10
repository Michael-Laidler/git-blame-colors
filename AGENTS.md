# AGENTS.md — git-blame-color

## Build & run

```sh
npm install
npm run compile    # tsc -p ./
```

Debug: open in VS Code, press `F5` (Extension Development Host).

## Architecture

- **`src/extension.ts`** — entry point. Registers commands, event listeners, WebviewViewProvider.
- **`src/gitBlame.ts`** — runs `git blame --line-porcelain`, parses output. Each blame block begins with `<sha> <orig-line> <result-line> [group-size]`.
- **`src/decorator.ts`** — applies `TextEditorDecorationType` per line. Supports 3 modes: `author`, `heat`, `off`.
- **`src/colorGenerator.ts`** — deterministic HSL hash → hex for author colors.
- **`src/heatColorGenerator.ts`** — linear interpolation between old/new hex colors by normalized timestamp.
- **`src/configuration.ts`** — singleton, wraps `vscode.workspace.getConfiguration('gitBlameColor')`.
- **`src/settingsPanel.ts`** — WebviewViewProvider for the Activity Bar sidebar (Color Picker, Mode buttons, Opacity slider).

## Gotchas

- **Config proxy mutation** — `config.get()` returns a VS Code proxy. Always `const x = { ...config.get(...) }` before mutation. Direct property assignment or `delete` throws.
- **Mode switch loop** — Setting mode from the Webview triggers `onDidChangeConfiguration`, which re-sends settings back. The Webview's `setMode()` must guard with `if (mode === currentMode) return;` to prevent infinite loop.
- **`onDidChangeTextDocument` debounce** — fires on every keystroke. Blame refresh is debounced at 500ms.
- **Single hover provider** — exactly one `registerHoverProvider` at startup, backed by a `Map<uri, Map<line, data>>`. Never register per-line providers.
- **No tests, no linter, no formatter config** in this repo.
- Output dir `out/` and `*.vsix` are gitignored + `.vscodeignore`d.
