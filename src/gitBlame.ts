import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export interface BlameLine {
  lineNumber: number;
  author: string;
  email: string;
  date: Date;
  commitHash: string;
  summary: string;
}

export interface BlameResult {
  lines: BlameLine[];
  authors: Set<string>;
}

export class GitBlame {
  public static async blame(filePath: string): Promise<BlameResult | null> {
    return new Promise((resolve) => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
      const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);

      cp.exec(
        `git blame --line-porcelain "${filePath}"`,
        { cwd, maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          if (error) {
            return resolve(null);
          }

          const result = GitBlame.parseBlameOutput(stdout);
          resolve(result);
        }
      );
    });
  }

  private static parseBlameOutput(output: string): BlameResult {
    const lines: BlameLine[] = [];
    const authors = new Set<string>();
    const parts = output.split('\n');

    let currentAuthor = 'Unknown';
    let currentEmail = '';
    let currentTimestamp = '0';
    let currentSummary = '';
    let currentCommit = '';
    let currentLineNo = 0;
    let readingMetadata = false;

    for (const part of parts) {
      if (part === '') {
        continue;
      }

      if (readingMetadata && part.startsWith('\t')) {
        if (currentLineNo > 0) {
          const blameLine: BlameLine = {
            lineNumber: currentLineNo,
            author: currentAuthor,
            email: currentEmail,
            date: new Date(parseInt(currentTimestamp || '0') * 1000),
            commitHash: currentCommit,
            summary: currentSummary
          };
          lines.push(blameLine);
          authors.add(blameLine.author);
        }

        currentAuthor = 'Unknown';
        currentEmail = '';
        currentTimestamp = '0';
        currentSummary = '';
        currentCommit = '';
        currentLineNo = 0;
        readingMetadata = false;
        continue;
      }

      const headerMatch = part.match(/^([a-f0-9]{40}|[0]{40})\s+(\d+)\s+(\d+)(?:\s+(\d+))?/);
      if (headerMatch) {
        currentCommit = headerMatch[1];
        currentLineNo = parseInt(headerMatch[3], 10);
        readingMetadata = true;

        if (currentCommit.match(/^0+$/)) {
          currentAuthor = 'Not Committed Yet';
        }
        continue;
      }

      if (!readingMetadata) {
        continue;
      }

      if (part.startsWith('author ')) {
        currentAuthor = part.substring(7);
      } else if (part.startsWith('author-mail ')) {
        currentEmail = part.substring(12).replace(/[<>]/g, '');
      } else if (part.startsWith('author-time ')) {
        currentTimestamp = part.substring(12);
      } else if (part.startsWith('summary ')) {
        currentSummary = part.substring(8);
      }
    }

    return { lines, authors };
  }
}
