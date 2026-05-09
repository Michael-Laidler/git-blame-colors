# Git Blame Color

A VS Code extension that colorizes code lines based on git blame author information.

## Features

- Colorizes code lines based on git blame author
- Custom colors configurable via VS Code settings
- Default colors generated from username hash (same user = same color)
- Toggle command to enable/disable annotations
- Hover information showing author, email, date, commit hash, and summary

## Configuration

### gitBlameColor.enabled
- Type: `boolean`
- Default: `true`
- Enable or disable git blame color annotation

### gitBlameColor.opacity
- Type: `number`
- Default: `0.2`
- Range: `0` to `1`
- Opacity of the blame color overlay

### gitBlameColor.colors
- Type: `object`
- Default: `{}`
- Custom colors for authors (format: `author name -> hex color`)

Example:
```json
{
  "gitBlameColor.colors": {
    "John Doe": "#FF5733",
    "Jane Smith": "#33FF57"
  }
}
```

## Commands

- `Git Blame Color: Toggle` - Toggle blame colors on/off
- `Git Blame Color: Show` - Display all authors and their colors in the current file

## Usage

1. Open a file in a git repository
2. The extension will automatically colorize lines based on git blame
3. Hover over any line to see detailed blame information
4. Customize colors in VS Code settings

## Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Open the project in VS Code and press `F5` to debug
