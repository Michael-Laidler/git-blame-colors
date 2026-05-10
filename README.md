# Git Blame Color

Eine VS Code Extension, die Codezeilen basierend auf `git blame`-Daten einfärbt – entweder pro Autor oder als Heatmap nach Commit-Alter.

## VSIX bauen (das Wichtigste)

```sh
npm run make-extension
```

Erzeugt `git-blame-color-0.0.1.vsix` im Projekt-Ordner. Diese Datei kann in VS Code über *Extensions → ... → Install from VSIX...* installiert werden.

Der Befehl kompiliert das TypeScript und packt alle nötigen Dateien in ein Installationspaket.

## Features

- **3 Färbungs-Modi**: Per Autor, als Heatmap (alt→neu), oder deaktiviert
- **Autor-Farben**: Jeder Autor bekommt eine deterministische Farbe (Hash). Farben sind in den Settings überschreibbar.
- **Heatmap-Modus**: Älteste Commits = Farbe 1, neueste = Farbe 2, dazwischen linearer Farbverlauf
- **Activity-Bar-Panel**: Klick auf das Icon in der linken Leiste öffnet die Sidebar mit allen Einstellungen
- **Color Picker**: Autorenfarben und Heat-Farben direkt aus der Sidebar wählbar
- **Opacity-Steuerung**: Globale Deckkraft des Overlays einstellbar
- **Hover-Info**: Mouseover zeigt Autor, Email, Datum, Commit-Hash und Summary
- **Toggle-Command**: Ein-/Ausschalten per Befehl

## Modi

| Modus | Beschreibung |
|-------|-------------|
| **Author** | Jeder Autor bekommt eine eigene Farbe (Hash oder benutzerdefiniert) |
| **Heat** | Farbverlauf zwischen alt (Standard Blau) und neu (Standard Rot) |
| **Off** | Keine Einfärbung |

## Konfiguration

### gitBlameColor.mode
- Typ: `"author"` \| `"heat"` \| `"off"`
- Default: `"author"`
- Färbungsmodus

### gitBlameColor.colors
- Typ: `object`
- Default: `{}`
- Benutzerdefinierte Autorenfarben

```json
{
  "gitBlameColor.colors": {
    "Max Mustermann": "#FF5733"
  }
}
```

### gitBlameColor.heatColors
- Typ: `object`
- Default: `{ "old": "#2196F3", "new": "#F44336" }`
- Farben für den Heat-Modus (alteste ↔ neueste Commits)

### gitBlameColor.opacity
- Typ: `number`
- Default: `0.2`
- Bereich: `0` bis `1`
- Deckkraft des Overlays

## Commands

- `Git Blame Color: Toggle` – Ein-/Ausschalten
- `Git Blame Color: Show` – Alle Autoren und ihre Farben anzeigen

## Entwicklung

```sh
npm install
npm run compile
```

In VS Code `F5` drücken → Extension Development Host öffnet sich.
