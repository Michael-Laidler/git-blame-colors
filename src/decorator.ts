import * as vscode from 'vscode';
import { BlameLine } from './gitBlame';
import { hashStringToColor, hexToRgba } from './colorGenerator';
import { interpolateColor, computeHeatRatio } from './heatColorGenerator';
import { Configuration, ColoringMode } from './configuration';

export interface HoverLineData {
  lineNumber: number;
  author: string;
  email: string;
  date: Date;
  commitHash: string;
  summary: string;
}

export class Decorator {
  private decorations: Map<string, vscode.TextEditorDecorationType[]>;
  private hoverData: Map<string, Map<number, HoverLineData>>;
  private hoverProvider: vscode.Disposable | undefined;
  private config: Configuration;

  constructor() {
    this.decorations = new Map();
    this.hoverData = new Map();
    this.config = Configuration.getInstance();
    this.registerHoverProvider();
  }

  private registerHoverProvider(): void {
    this.hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: 'file' },
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

          const msg = new vscode.MarkdownString();
          msg.appendMarkdown(`**${lineData.author}**\n\n`);
          msg.appendMarkdown(`Email: ${lineData.email || 'N/A'}\n\n`);
          msg.appendMarkdown(`Date: ${lineData.date.toLocaleString()}\n\n`);
          msg.appendMarkdown(`Commit: \`${lineData.commitHash.substring(0, 7)}\`\n\n`);
          if (lineData.summary) {
            msg.appendMarkdown(`Summary: ${lineData.summary}`);
          }
          return new vscode.Hover(msg);
        }
      }
    );
  }

  public getColorForAuthor(author: string): string {
    const customColor = this.config.getColorForAuthor(author);
    if (customColor) {
      return customColor;
    }
    return hashStringToColor(author);
  }

  public async applyBlameDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[]
  ): Promise<void> {
    const mode = this.config.getMode();

    if (mode === 'off') {
      this.clearDecorations(editor.document.uri.toString());
      return;
    }

    const opacity = this.config.getOpacity();
    const editorId = editor.document.uri.toString();
    const hoverData = new Map<number, HoverLineData>();

    for (const blameLine of blameLines) {
      hoverData.set(blameLine.lineNumber - 1, {
        lineNumber: blameLine.lineNumber,
        author: blameLine.author,
        email: blameLine.email,
        date: blameLine.date,
        commitHash: blameLine.commitHash,
        summary: blameLine.summary
      });
    }

    this.hoverData.set(editorId, hoverData);

    if (mode === 'heat') {
      this.applyHeatDecoration(editor, blameLines, opacity, editorId);
    } else {
      this.applyAuthorDecoration(editor, blameLines, opacity, editorId);
    }
  }

  private applyAuthorDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[],
    opacity: number,
    editorId: string
  ): void {
    const decorationsByColor = new Map<string, vscode.Range[]>();

    for (const blameLine of blameLines) {
      const color = this.getColorForAuthor(blameLine.author);
      if (!decorationsByColor.has(color)) {
        decorationsByColor.set(color, []);
      }
      const line = blameLine.lineNumber - 1;
      decorationsByColor.get(color)!.push(new vscode.Range(line, 0, line, 0));
    }

    this.applyDecorationTypes(editor, decorationsByColor, opacity, editorId);
  }

  private applyHeatDecoration(
    editor: vscode.TextEditor,
    blameLines: BlameLine[],
    opacity: number,
    editorId: string
  ): void {
    const heatColors = this.config.getHeatColors();
    const timestamps = blameLines.map(l => l.date.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const decorationsByColor = new Map<string, vscode.Range[]>();

    for (const blameLine of blameLines) {
      const ts = blameLine.date.getTime();
      const ratio = computeHeatRatio(ts, minTime, maxTime);
      const color = interpolateColor(ratio, heatColors.old, heatColors.new);

      if (!decorationsByColor.has(color)) {
        decorationsByColor.set(color, []);
      }
      const line = blameLine.lineNumber - 1;
      decorationsByColor.get(color)!.push(new vscode.Range(line, 0, line, 0));
    }

    this.applyDecorationTypes(editor, decorationsByColor, opacity, editorId);
  }

  private applyDecorationTypes(
    editor: vscode.TextEditor,
    decorationsByColor: Map<string, vscode.Range[]>,
    opacity: number,
    editorId: string
  ): void {
    this.clearDecorations(editorId);
    const newDecorations: vscode.TextEditorDecorationType[] = [];

    for (const [color, ranges] of decorationsByColor) {
      const decorationType = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: hexToRgba(color, opacity),
        overviewRulerColor: color,
        overviewRulerLane: vscode.OverviewRulerLane.Right
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
      }
    } else {
      for (const decorations of this.decorations.values()) {
        for (const decoration of decorations) {
          decoration.dispose();
        }
      }
      this.decorations.clear();
      this.hoverData.clear();
    }
  }

  public dispose(): void {
    this.clearDecorations();
    if (this.hoverProvider) {
      this.hoverProvider.dispose();
    }
  }
}
