import * as vscode from 'vscode';
import { GitBlame } from './gitBlame';
import { Decorator } from './decorator';
import { Configuration } from './configuration';
import { SettingsPanel } from './settingsPanel';

function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

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

    const emails = [...new Set(result.lines.map(l => l.email).filter(Boolean))];
    const message = emails.map(e => {
      return `${e}: ${decorator!.getColorForAuthor('', e)}`;
    }).join('\n');

    vscode.window.showInformationMessage(`Authors in file:\n${message}`);
  });

  const compareFromCommand = vscode.commands.registerCommand('gitBlameColor.compareFrom', async (filePath: string, fromHash: string) => {
    const commits = await GitBlame.getFileLog(filePath);
    if (commits.length === 0) {
      vscode.window.showInformationMessage('Keine Commits für diese Datei gefunden.');
      return;
    }

    const items = commits
      .filter(c => c.hash !== fromHash)
      .map(c => ({
        label: c.message,
        description: `${c.author} · ${new Date(c.date).toLocaleDateString('de-DE')}`,
        detail: c.hash.substring(0, 7),
        hash: c.hash
      }));

    const second = await vscode.window.showQuickPick(items, {
      title: `Vergleichen mit: ${fromHash.substring(0, 7)} — zweite Version wählen`,
      placeHolder: 'Commit auswählen…'
    });
    if (!second) { return; }

    const fileUri = vscode.Uri.file(filePath);
    const gitExt = vscode.extensions.getExtension('vscode.git')?.exports as any;
    const git = gitExt?.getAPI(1);
    if (!git) { vscode.window.showErrorMessage('Git-Extension nicht verfügbar.'); return; }

    const uri1 = git.toGitUri(fileUri, fromHash);
    const uri2 = git.toGitUri(fileUri, second.hash);
    const title = `${basename(filePath)}: ${fromHash.substring(0, 7)} ↔ ${second.hash.substring(0, 7)}`;
    await vscode.commands.executeCommand('vscode.diff', uri1, uri2, title);
  });

  const showHistoryCommand = vscode.commands.registerCommand('gitBlameColor.showHistory', async (filePath: string) => {
    const commits = await GitBlame.getFileLog(filePath);
    if (commits.length === 0) {
      vscode.window.showInformationMessage('Keine Commits für diese Datei gefunden.');
      return;
    }

    const items = commits.map(c => ({
      label: c.message,
      description: `${c.author} · ${new Date(c.date).toLocaleDateString('de-DE')}`,
      detail: c.hash.substring(0, 7),
      hash: c.hash
    }));

    const first = await vscode.window.showQuickPick(items, {
      title: 'Versionsvergleich — erste Version wählen',
      placeHolder: 'Commit auswählen…'
    });
    if (!first) { return; }

    const second = await vscode.window.showQuickPick(
      items.filter(i => i.hash !== first.hash),
      {
        title: `Versionsvergleich — zweite Version wählen (erste: ${first.hash.substring(0, 7)})`,
        placeHolder: 'Commit auswählen…'
      }
    );
    if (!second) { return; }

    const fileUri = vscode.Uri.file(filePath);
    const gitExt = vscode.extensions.getExtension('vscode.git')?.exports as any;
    const git = gitExt?.getAPI(1);
    if (!git) {
      vscode.window.showErrorMessage('Git-Extension nicht verfügbar.');
      return;
    }

    const uri1 = git.toGitUri(fileUri, first.hash);
    const uri2 = git.toGitUri(fileUri, second.hash);
    const title = `${basename(filePath)}: ${first.hash.substring(0, 7)} ↔ ${second.hash.substring(0, 7)}`;
    await vscode.commands.executeCommand('vscode.diff', uri1, uri2, title);
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
    compareFromCommand,
    showHistoryCommand,
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
    const emails = [...new Set(result.lines.map(l => l.email).filter(Boolean))];
    await config!.ensureEmailColors(emails);
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
