import * as vscode from 'vscode';
import { hashStringToColor } from './colorGenerator';

export type ColoringMode = 'author' | 'heat' | 'off';

export interface GitBlameColorConfig {
  mode: ColoringMode;
  enabled: boolean;
  colors: Record<string, string>;
  heatColors: { old: string; new: string };
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
      mode: config.get<ColoringMode>('mode', 'author'),
      enabled: config.get<boolean>('enabled', true),
      colors: { ...config.get<Record<string, string>>('colors', {}) },
      heatColors: { ...config.get<{ old: string; new: string }>('heatColors', { old: '#2196F3', new: '#F44336' }) }
    };
  }

  public getMode(): ColoringMode {
    return this.getConfig().mode;
  }

  public isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  public getCustomColors(): Record<string, string> {
    return this.getConfig().colors;
  }

  public getColorForEmail(email: string): string | undefined {
    return this.getCustomColors()[email];
  }

  public async ensureEmailColors(emails: string[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('gitBlameColor');
    const existing = { ...config.get<Record<string, string>>('colors', {}) };

    const additions: Record<string, string> = {};
    for (const email of emails) {
      if (email && !existing[email]) {
        additions[email] = hashStringToColor(email);
      }
    }

    if (Object.keys(additions).length > 0) {
      await config.update('colors', { ...existing, ...additions }, vscode.ConfigurationTarget.Workspace);
    }
  }

  public getHeatColors(): { old: string; new: string } {
    return this.getConfig().heatColors;
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
