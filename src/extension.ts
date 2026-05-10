import * as vscode from 'vscode';
import { GitBlame } from './gitBlame';
import { Decorator } from './decorator';
import { Configuration } from './configuration';
import { SettingsPanel } from './settingsPanel';

let decorator: Decorator | undefined;
let config: Configuration | undefined;
let isEnabled = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  decorator = new Decorator();
  config = Configuration.getInstance();

  const settingsPanel = new SettingsPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SettingsPanel.viewType, settingsPanel)
  );

  const toggleCommand = vscode.commands.registerCommand('gitBlameColor.toggle', async () => {
    isEnabled = !isEnabled;

    if (isEnabled) {
      await updateDecorations();
    } else {
      decorator?.clearDecorations();
    }

    vscode.window.showInformationMessage(
      `Git Blame Color ${isEnabled ? 'enabled' : 'disabled'}`
    );
  });

  const showCommand = vscode.commands.registerCommand('gitBlameColor.show', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }
     
    const result = await GitBlame.blame(editor.document.uri.fsPath);
    if (!result) {
      vscode.window.showInformationMessage('No git blame data available');
      return;
    }

    const authors = Array.from(result.authors);
    const message = authors.map(a => {
      return `${a}: ${decorator!.getColorForAuthor(a)}`;
    }).join('\n');

    vscode.window.showInformationMessage(`Authors in file:\n${message}`);
  });

  const editorChange = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && isEnabled) {
      await applyBlameToEditor(editor);
    }
  });

  const docChange = vscode.workspace.onDidChangeTextDocument(async (e) => {
    const editor = vscode.window.activeTextEditor;
    if (!isEnabled || !editor || editor.document !== e.document) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      await applyBlameToEditor(editor);
    }, 500);
  });

  const configListener = config.onConfigChange(() => {
    if (isEnabled && vscode.window.activeTextEditor) {
      updateDecorations();
    }
  });

  context.subscriptions.push(
    toggleCommand,
    showCommand,
    editorChange,
    docChange,
    configListener
  );

  if (config.isEnabled()) {
    isEnabled = true;
    updateDecorations();
  }
}

async function applyBlameToEditor(editor: vscode.TextEditor): Promise<void> {
  if (!decorator) {
    return;
  }
  const result = await GitBlame.blame(editor.document.uri.fsPath);
  if (result) {
    await decorator.applyBlameDecoration(editor, result.lines);
  }
}

async function updateDecorations(): Promise<void> {
  for (const editor of vscode.window.visibleTextEditors) {
    await applyBlameToEditor(editor);
  }
}

export function deactivate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  decorator?.dispose();
  config?.dispose();
}
