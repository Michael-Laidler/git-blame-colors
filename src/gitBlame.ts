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

export interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
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

  public static async getRemoteUrl(filePath: string): Promise<string | null> {
    return new Promise((resolve) => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
      const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);
      cp.exec('git remote get-url origin', { cwd }, (error, stdout) => {
        if (error) { return resolve(null); }
        resolve(stdout.trim());
      });
    });
  }

  public static remoteToWebUrl(remoteUrl: string): string | null {
    const sshMatch = remoteUrl.match(/git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
    const httpsMatch = remoteUrl.match(/https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return `https://${httpsMatch[1]}/${httpsMatch[2]}`;
    }
    return null;
  }

  public static async getDefaultBranch(filePath: string): Promise<string> {
    return new Promise((resolve) => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
      const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);
      cp.exec('git symbolic-ref refs/remotes/origin/HEAD --short', { cwd }, (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim().replace(/^origin\//, ''));
          return;
        }
        cp.exec('git branch -r', { cwd }, (err2, stdout2) => {
          if (!err2) {
            const branches = stdout2.split('\n').map((b: string) => b.trim());
            if (branches.some((b: string) => b === 'origin/main')) { resolve('main'); return; }
            if (branches.some((b: string) => b === 'origin/master')) { resolve('master'); return; }
          }
          resolve('main');
        });
      });
    });
  }

  public static async getFileLog(filePath: string): Promise<CommitInfo[]> {
    return new Promise((resolve) => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
      const cwd = workspaceFolder?.uri.fsPath || path.dirname(filePath);

      cp.exec(
        `git log --follow --format="%H|%an|%at|%s" -- "${filePath}"`,
        { cwd, maxBuffer: 1024 * 1024 * 5 },
        (error, stdout) => {
          if (error) { return resolve([]); }
          const commits = stdout.trim().split('\n').filter(Boolean).map(line => {
            const parts = line.split('|');
            return {
              hash: parts[0],
              author: parts[1],
              date: new Date(parseInt(parts[2]) * 1000),
              message: parts.slice(3).join('|')
            };
          });
          resolve(commits);
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
