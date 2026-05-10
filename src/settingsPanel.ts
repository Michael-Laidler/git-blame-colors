import * as vscode from 'vscode';

export class SettingsPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gitBlameColor.settings';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'getSettings': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          webviewView.webview.postMessage({
            type: 'settings',
            mode: config.get<string>('mode', 'author'),
            colors: config.get<Record<string, string>>('colors', {}),
            heatColors: config.get<{ old: string; new: string }>('heatColors', { old: '#2196F3', new: '#F44336' }),
            opacity: config.get<number>('opacity', 0.2)
          });
          break;
        }
        case 'setMode': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          await config.update('mode', message.mode, vscode.ConfigurationTarget.Global);
          webviewView.webview.postMessage({ type: 'saved' });
          break;
        }
        case 'saveColor': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          const colors = { ...config.get<Record<string, string>>('colors', {}) };
          colors[message.author] = message.color;
          await config.update('colors', colors, vscode.ConfigurationTarget.Global);
          webviewView.webview.postMessage({ type: 'saved' });
          break;
        }
        case 'removeColor': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          const colors = { ...config.get<Record<string, string>>('colors', {}) };
          delete colors[message.author];
          await config.update('colors', colors, vscode.ConfigurationTarget.Global);
          webviewView.webview.postMessage({ type: 'saved' });
          break;
        }
        case 'setOpacity': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          await config.update('opacity', message.opacity, vscode.ConfigurationTarget.Global);
          break;
        }
        case 'setHeatColor': {
          const config = vscode.workspace.getConfiguration('gitBlameColor');
          const heatColors = { ...config.get<{ old: string; new: string }>('heatColors', { old: '#2196F3', new: '#F44336' }) };
          heatColors[message.key as 'old' | 'new'] = message.color;
          await config.update('heatColors', heatColors, vscode.ConfigurationTarget.Global);
          break;
        }
      }
    });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 12px; color: var(--vscode-editor-foreground); }
    h3 { margin: 0 0 12px 0; font-weight: 600; }
    label { display: block; font-size: 12px; margin-bottom: 4px; color: var(--vscode-descriptionForeground); }
    input, button { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
    input[type="text"] {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 4px 8px; border-radius: 2px;
    }
    .color-row {
      display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
    }
    .color-row input[type="text"] { flex: 1; margin-bottom: 0; }
    .color-row input[type="color"] {
      width: 40px; height: 28px; padding: 0; border: none; cursor: pointer; flex-shrink: 0;
    }
    .color-row button {
      width: 28px; height: 28px; padding: 0; flex-shrink: 0; cursor: pointer;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px; font-size: 14px; line-height: 1;
    }
    .color-row button:hover { background: var(--vscode-button-hoverBackground); color: var(--vscode-button-foreground); }
    .add-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; padding: 6px; cursor: pointer; border-radius: 2px;
    }
    .add-btn:hover { background: var(--vscode-button-hoverBackground); }

    .mode-section { margin-bottom: 16px; }
    .mode-label { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; display: block; }
    .mode-options { display: flex; gap: 4px; }
    .mode-btn {
      flex: 1; padding: 6px 4px; cursor: pointer; text-align: center; font-size: 11px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px; transition: none;
    }
    .mode-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .mode-btn:hover:not(.active) { background: var(--vscode-list-hoverBackground); }

    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px 0; color: var(--vscode-descriptionForeground); }
    .author-list { margin-top: 8px; }
    .author-item {
      display: flex; align-items: center; gap: 8px; padding: 6px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .author-item .swatch { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; }
    .author-item .name { flex: 1; font-size: 13px; }
    .author-item button {
      width: auto; padding: 2px 8px; margin: 0; cursor: pointer;
      background: transparent; border: 1px solid var(--vscode-panel-border); border-radius: 2px;
      color: var(--vscode-editor-foreground); font-size: 12px;
    }
    .author-item button:hover { background: var(--vscode-list-hoverBackground); }
    .opacity-section { margin-top: 16px; }
    input[type="range"] { width: 100%; cursor: pointer; }
    .opacity-value { font-size: 12px; color: var(--vscode-descriptionForeground); text-align: right; }
    .empty-state { font-size: 12px; color: var(--vscode-descriptionForeground); text-align: center; padding: 16px 0; }
    .heat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .heat-row label { flex: 1; margin: 0; }
    .heat-row input[type="color"] { width: 40px; height: 28px; padding: 0; border: none; cursor: pointer; flex-shrink: 0; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="mode-section">
    <span class="mode-label">Coloring Mode</span>
    <div class="mode-options">
      <button class="mode-btn" data-mode="author">Author</button>
      <button class="mode-btn" data-mode="heat">Heat</button>
      <button class="mode-btn" data-mode="off">Off</button>
    </div>
  </div>

  <div id="authorSection">
    <div class="section-title">Author Colors</div>
    <div class="color-row">
      <input type="text" id="authorName" placeholder="Author name" />
      <input type="color" id="authorColor" value="#4CAF50" />
      <button id="addBtn" title="Add author">+</button>
    </div>
    <div class="author-list" id="authorList"></div>
  </div>

  <div id="heatSection" class="hidden">
    <div class="section-title">Heat Colors</div>
    <div class="heat-row">
      <label>Old commit</label>
      <input type="color" id="heatColorOld" value="#2196F3" />
    </div>
    <div class="heat-row">
      <label>New commit</label>
      <input type="color" id="heatColorNew" value="#F44336" />
    </div>
  </div>

  <div class="opacity-section">
    <label for="opacitySlider">Opacity</label>
    <input type="range" id="opacitySlider" min="0" max="1" step="0.05" value="0.2" />
    <div class="opacity-value" id="opacityValue">0.20</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const authorSection = document.getElementById('authorSection');
    const heatSection = document.getElementById('heatSection');
    const authorNameInput = document.getElementById('authorName');
    const authorColorInput = document.getElementById('authorColor');
    const addBtn = document.getElementById('addBtn');
    const authorList = document.getElementById('authorList');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const heatColorOld = document.getElementById('heatColorOld');
    const heatColorNew = document.getElementById('heatColorNew');

    let currentMode = 'author';

    function setMode(mode) {
      if (mode === currentMode) return;
      currentMode = mode;
      modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
      authorSection.classList.toggle('hidden', mode !== 'author');
      heatSection.classList.toggle('hidden', mode !== 'heat');
      vscode.postMessage({ type: 'setMode', mode });
    }

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    function renderAuthors(colors) {
      const entries = Object.entries(colors);
      if (entries.length === 0) {
        authorList.innerHTML = '<div class="empty-state">No custom colors configured yet.</div>';
        return;
      }
      authorList.innerHTML = entries.map(([name, color]) => {
        const encodedName = encodeURIComponent(name);
        return \`
          <div class="author-item" data-author="\${encodedName}">
            <div class="swatch" style="background: \${color}"></div>
            <div class="name">\${name}</div>
            <button class="edit-btn" data-author="\${encodedName}">Edit</button>
            <button class="remove-btn" data-author="\${encodedName}">X</button>
          </div>
        \`;
      }).join('');

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = decodeURIComponent(btn.dataset.author);
          const colors = JSON.parse(sessionStorage.getItem('colors') || '{}');
          authorNameInput.value = name;
          authorColorInput.value = colors[name] || '#4CAF50';
        });
      });

      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = decodeURIComponent(btn.dataset.author);
          vscode.postMessage({ type: 'removeColor', author: name });
        });
      });
    }

    addBtn.addEventListener('click', () => {
      const name = authorNameInput.value.trim();
      if (!name) return;
      vscode.postMessage({ type: 'saveColor', author: name, color: authorColorInput.value });
      authorNameInput.value = '';
    });

    authorNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click();
    });

    opacitySlider.addEventListener('input', () => {
      const val = parseFloat(opacitySlider.value);
      opacityValue.textContent = val.toFixed(2);
      vscode.postMessage({ type: 'setOpacity', opacity: val });
    });

    heatColorOld.addEventListener('input', () => {
      vscode.postMessage({ type: 'setHeatColor', key: 'old', color: heatColorOld.value });
    });

    heatColorNew.addEventListener('input', () => {
      vscode.postMessage({ type: 'setHeatColor', key: 'new', color: heatColorNew.value });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'settings') {
        setMode(msg.mode);
        renderAuthors(msg.colors);
        sessionStorage.setItem('colors', JSON.stringify(msg.colors));
        opacitySlider.value = msg.opacity;
        opacityValue.textContent = parseFloat(msg.opacity).toFixed(2);
        heatColorOld.value = msg.heatColors.old;
        heatColorNew.value = msg.heatColors.new;
      } else if (msg.type === 'saved') {
        vscode.postMessage({ type: 'getSettings' });
      }
    });

    vscode.postMessage({ type: 'getSettings' });
  </script>
</body>
</html>`;
  }
}
