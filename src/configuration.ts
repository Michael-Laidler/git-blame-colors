import * as vscode from 'vscode';

export interface GitBlameColorConfig {
  enabled: boolean;
  colors: Record<string, string>;
  opacity: number;
}

export class Configuration {
  private static instance: Configuration;
  private configChangeListener: vscode.Disposable | undefined;

  private constructor() {}

  public static getInstance(): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  public getConfig(): GitBlameColorConfig {
    const config = vscode.workspace.getConfiguration('gitBlameColor');
    return {
      enabled: config.get<boolean>('enabled', true),
      colors: config.get<Record<string, string>>('colors', {}),
      opacity: config.get<number>('opacity', 0.2)
    };
  }

  public isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  public getOpacity(): number {
    return this.getConfig().opacity;
  }

  public getCustomColors(): Record<string, string> {
    return this.getConfig().colors;
  }

  public getColorForAuthor(author: string): string | undefined {
    return this.getCustomColors()[author];
  }

  public onConfigChange(callback: (config: GitBlameColorConfig) => void): vscode.Disposable {
    this.configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('gitBlameColor')) {
        callback(this.getConfig());
      }
    });
    return this.configChangeListener;
  }

  public dispose(): void {
    if (this.configChangeListener) {
      this.configChangeListener.dispose();
    }
  }
}
