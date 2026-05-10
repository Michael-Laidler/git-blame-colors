import * as vscode from 'vscode';

export type ColoringMode = 'author' | 'heat' | 'off';

export interface GitBlameColorConfig {
  mode: ColoringMode;
  enabled: boolean;
  colors: Record<string, string>;
  heatColors: { old: string; new: string };
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
      mode: config.get<ColoringMode>('mode', 'author'),
      enabled: config.get<boolean>('enabled', true),
      colors: { ...config.get<Record<string, string>>('colors', {}) },
      heatColors: { ...config.get<{ old: string; new: string }>('heatColors', { old: '#2196F3', new: '#F44336' }) },
      opacity: config.get<number>('opacity', 0.2)
    };
  }

  public getMode(): ColoringMode {
    return this.getConfig().mode;
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
