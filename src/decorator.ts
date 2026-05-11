import * as vscode from "vscode";
import { BlameLine, GitBlame, CommitInfo } from "./gitBlame";
import { hashStringToColor } from "./colorGenerator";
import { interpolateColor, computeHeatRatio } from "./heatColorGenerator";
import { Configuration } from "./configuration";

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export interface HoverLineData {
  lineNumber: number;
  author: string;
  email: string;
  date: Date;
  commitHash: string;
  summary: string;
  rawLen: number;
}

export class Decorator {
  private decorations: Map<string, vscode.TextEditorDecorationType[]>;
  private hoverData: Map<string, Map<number, HoverLineData>>;
  private remoteWebUrls: Map<string, string | null>;
  private defaultBranchCache: Map<string, string>;
  private fileLogCache: Map<string, CommitInfo[]>;
  private hoverProvider: vscode.Disposable | undefined;
  private config: Configuration;

  constructor() {
    this.decorations = new Map();
    this.hoverData = new Map();
    this.remoteWebUrls = new Map();
    this.defaultBranchCache = new Map();
    this.fileLogCache = new Map();
    this.config = Configuration.getInstance();
    this.registerHoverProvider();
  }

  private registerHoverProvider(): void {
    this.hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: "file" },
      {
        provideHover: (document, position) => {
          const uriStr = document.uri.toString();
          const lines = this.hoverData.get(uriStr);
          if (!lines) {
            return undefined;
          }

          const lineData = lines.get(position.line);
          if (!lineData) {
            return undefined;
          }

          // Only show hover over the decoration area (after source code), not over source code itself
          if (position.character < lineData.rawLen) {
            return undefined;
          }

          const remoteWebUrl = this.remoteWebUrls.get(uriStr) ?? null;
          const defaultBranch = this.defaultBranchCache.get(uriStr) ?? "main";
          const fileLog = this.fileLogCache.get(uriStr) ?? [];
          const isUncommitted = lineData.author === "Not Committed Yet";

          const msg = new vscode.MarkdownString();
          msg.isTrusted = true;
          msg.supportThemeIcons = true;

          msg.appendMarkdown(`**${lineData.author}**`);
          if (!isUncommitted && lineData.email) {
            msg.appendMarkdown(` \`<${lineData.email}>\``);
          }
          msg.appendMarkdown("\n\n");

          if (!isUncommitted) {
            msg.appendMarkdown(
              `$(calendar) ${lineData.date.toLocaleString("de-DE")}` +
                `  ·  $(git-commit) \`${lineData.commitHash.substring(0, 7)}\``,
            );
            if (lineData.summary) {
              msg.appendMarkdown(`\n\n_${lineData.summary}_`);
            }

            // File history
            if (fileLog.length > 0) {
              msg.appendMarkdown(
                "\n\n---\n\n**$(history) Verlauf** — Commit anklicken zum Vergleichen\n\n",
              );
              for (const commit of fileLog.slice(0, 10)) {
                const args = encodeURIComponent(
                  JSON.stringify([document.uri.fsPath, commit.hash]),
                );
                const date = commit.date.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                });
                const msg_ =
                  commit.message.length > 48
                    ? commit.message.substring(0, 48) + "…"
                    : commit.message;
                const marker = commit.hash === lineData.commitHash ? " ◀" : "";
                msg.appendMarkdown(
                  `[\`${commit.hash.substring(0, 7)}\`  ${date}  ${msg_}${marker}](command:gitBlameColor.compareFrom?${args})\n\n`,
                );
              }
            }

            if (remoteWebUrl) {
              const isGitLab = remoteWebUrl.includes("gitlab");
              const commitUrl = isGitLab
                ? `${remoteWebUrl}/-/commit/${lineData.commitHash}`
                : `${remoteWebUrl}/commit/${lineData.commitHash}`;
              const projectUrl = isGitLab
                ? `${remoteWebUrl}/-/tree/${defaultBranch}`
                : `${remoteWebUrl}/tree/${defaultBranch}`;
              const hostLabel = isGitLab ? "GitLab" : "GitHub";
              msg.appendMarkdown("---\n\n");
              msg.appendMarkdown(
                `[$(git-commit) Commit](${commitUrl}) _(${hostLabel})_  ·  [$(repo) Projekt](${projectUrl}) _(${hostLabel})_`,
              );
            }
          }

          const anchorPos = new vscode.Position(position.line, lineData.rawLen);
          return new vscode.Hover(msg, new vscode.Range(anchorPos, anchorPos));
        },
      },
    );
  }

  public getColorForAuthor(author: string, email: string): string {
    const customColor = this.config.getColorForEmail(email);
    if (customColor) {
      return customColor;
    }
    return hashStringToColor(email);
  }

  public async applyBlameDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[],
  ): Promise<void> {
    const mode = this.config.getMode();

    if (mode === "off") {
      this.clearDecorations(editor.document.uri.toString());
      return;
    }

    const editorId = editor.document.uri.toString();

    this.clearDecorations(editorId);

    if (!this.remoteWebUrls.has(editorId)) {
      const raw = await GitBlame.getRemoteUrl(editor.document.uri.fsPath);
      this.remoteWebUrls.set(
        editorId,
        raw ? GitBlame.remoteToWebUrl(raw) : null,
      );
    }

    if (!this.defaultBranchCache.has(editorId)) {
      GitBlame.getDefaultBranch(editor.document.uri.fsPath).then((branch) => {
        this.defaultBranchCache.set(editorId, branch);
      });
    }

    if (!this.fileLogCache.has(editorId)) {
      GitBlame.getFileLog(editor.document.uri.fsPath).then((log) => {
        this.fileLogCache.set(editorId, log);
      });
    }

    const hoverData = new Map<number, HoverLineData>();
    for (const blameLine of blameLines) {
      const rawLen = editor.document.lineAt(blameLine.lineNumber - 1).text
        .length;
      hoverData.set(blameLine.lineNumber - 1, {
        lineNumber: blameLine.lineNumber,
        author: blameLine.author,
        email: blameLine.email,
        date: blameLine.date,
        commitHash: blameLine.commitHash,
        summary: blameLine.summary,
        rawLen,
      });
    }
    this.hoverData.set(editorId, hoverData);

    if (mode === "heat") {
      this.applyHeatDecoration(editor, blameLines, editorId);
    } else {
      this.applyAuthorDecoration(editor, blameLines, editorId);
    }
  }

  private applyAuthorDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[],
    editorId: string,
  ): void {
    const tabSize = (editor.options.tabSize as number) ?? 4;
    const lineMetrics = blameLines.map((b) => {
      const text = editor.document.lineAt(b.lineNumber - 1).text;
      let vl = 0;
      for (const c of text) {
        vl += c === "\t" ? tabSize - (vl % tabSize) : 1;
      }
      return { rawLen: text.length, vl };
    });
    const maxVl =
      lineMetrics.length > 0 ? Math.max(...lineMetrics.map((m) => m.vl)) : 0;
    const maxAuthorLen = Math.max(...blameLines.map((b) => b.author.length));

    type CommitEntry = {
      ranges: vscode.Range[];
      vl: number;
      author: string;
      date: Date;
      email: string;
      summary: string;
    };
    const byGroup = new Map<string, CommitEntry>();

    for (let i = 0; i < blameLines.length; i++) {
      const blameLine = blameLines[i];
      const line = blameLine.lineNumber - 1;
      const { rawLen, vl } = lineMetrics[i];
      const key = `${blameLine.commitHash}:${vl}`;
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          ranges: [],
          vl,
          author: blameLine.author,
          date: blameLine.date,
          email: blameLine.email,
          summary: blameLine.summary,
        });
      }
      byGroup
        .get(key)!
        .ranges.push(new vscode.Range(line, rawLen, line, rawLen));
    }

    const newDecorations: vscode.TextEditorDecorationType[] = [];
    const SP = " ";

    for (const [, { ranges, vl, author, date, email, summary }] of byGroup) {
      const color = this.getColorForAuthor(author, email);
      const paddedAuthor =
        author + SP.repeat(Math.max(0, maxAuthorLen - author.length));
      const summaryText =
        summary.length > 35 ? summary.substring(0, 35) + "…" : summary;
      const label =
        author === "Not Committed Yet"
          ? `${SP}${SP}not${SP}committed`
          : `${SP}${SP}${formatDate(date)}${SP}${SP}${paddedAuthor}${SP}${SP}${summaryText}`;
      const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: label,
          color,
          margin: `0 0 0 ${maxVl - vl + 2}ch`,
        },
      });
      editor.setDecorations(decorationType, ranges);
      newDecorations.push(decorationType);
    }

    this.decorations.set(editorId, newDecorations);
  }

  private applyHeatDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[],
    editorId: string,
  ): void {
    const heatColors = this.config.getHeatColors();
    const timestamps = blameLines.map((l) => l.date.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const tabSize = (editor.options.tabSize as number) ?? 4;
    const lineMetrics = blameLines.map((b) => {
      const text = editor.document.lineAt(b.lineNumber - 1).text;
      let vl = 0;
      for (const c of text) {
        vl += c === "\t" ? tabSize - (vl % tabSize) : 1;
      }
      return { rawLen: text.length, vl };
    });
    const maxVl =
      lineMetrics.length > 0 ? Math.max(...lineMetrics.map((m) => m.vl)) : 0;
    const maxAuthorLen = Math.max(...blameLines.map((b) => b.author.length));

    type CommitEntry = {
      ranges: vscode.Range[];
      vl: number;
      author: string;
      date: Date;
      summary: string;
    };
    const byGroup = new Map<string, CommitEntry>();

    for (let i = 0; i < blameLines.length; i++) {
      const blameLine = blameLines[i];
      const line = blameLine.lineNumber - 1;
      const { rawLen, vl } = lineMetrics[i];
      const key = `${blameLine.commitHash}:${vl}`;
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          ranges: [],
          vl,
          author: blameLine.author,
          date: blameLine.date,
          summary: blameLine.summary,
        });
      }
      byGroup
        .get(key)!
        .ranges.push(new vscode.Range(line, rawLen, line, rawLen));
    }

    const newDecorations: vscode.TextEditorDecorationType[] = [];
    const SP = " ";

    for (const [, { ranges, vl, author, date, summary }] of byGroup) {
      const ratio = computeHeatRatio(date.getTime(), minTime, maxTime);
      const color = interpolateColor(ratio, heatColors.old, heatColors.new);
      const paddedAuthor =
        author + SP.repeat(Math.max(0, maxAuthorLen - author.length));
      const summaryText =
        summary.length > 35 ? summary.substring(0, 35) + "…" : summary;
      const label =
        author === "Not Committed Yet"
          ? `${SP}${SP}not${SP}committed`
          : `${SP}${SP}${formatDate(date)}${SP}${SP}${paddedAuthor}${SP}${SP}${summaryText}`;
      const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: label,
          color,
          margin: `0 0 0 ${maxVl - vl + 2}ch`,
        },
      });
      editor.setDecorations(decorationType, ranges);
      newDecorations.push(decorationType);
    }

    this.decorations.set(editorId, newDecorations);
  }

  public clearDecorations(editorId?: string): void {
    if (editorId) {
      const decorations = this.decorations.get(editorId);
      if (decorations) {
        for (const decoration of decorations) {
          decoration.dispose();
        }
        this.decorations.delete(editorId);
        this.hoverData.delete(editorId);
        this.remoteWebUrls.delete(editorId);
        this.defaultBranchCache.delete(editorId);
        this.fileLogCache.delete(editorId);
      }
    } else {
      for (const decorations of this.decorations.values()) {
        for (const decoration of decorations) {
          decoration.dispose();
        }
      }
      this.decorations.clear();
      this.hoverData.clear();
      this.remoteWebUrls.clear();
      this.defaultBranchCache.clear();
      this.fileLogCache.clear();
    }
  }

  public dispose(): void {
    this.clearDecorations();
    if (this.hoverProvider) {
      this.hoverProvider.dispose();
    }
  }
}
