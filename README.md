# Git Blame Color

Eine VS Code Extension, die Codezeilen mit `git blame`-Informationen als Inline-Text annotiert – entweder farbig pro Autor oder als Heatmap nach Commit-Alter.

## VSIX bauen (das Wichtigste)

```sh
npm run make-extension
```

Erzeugt `git-blame-color-0.0.1.vsix` im Projekt-Ordner. Diese Datei kann in VS Code über *Extensions → ... → Install from VSIX...* installiert werden.

Der Befehl kompiliert das TypeScript und packt alle nötigen Dateien in ein Installationspaket.

## Features

- **Inline-Annotierungen**: Nach jeder Codezeile erscheint `  Datum  Autor  Commit-Summary` in der jeweiligen Farbe – kein Hintergrund-Overlay
- **3 Färbungs-Modi**: Per Autor, als Heatmap (alt→neu), oder deaktiviert
- **Autor-Farben**: Jede E-Mail-Adresse bekommt eine deterministische Farbe (Hash). Wird beim ersten Blame-Aufruf automatisch in den Workspace-Settings gespeichert. Überschreibbar in der Sidebar.
- **Heatmap-Modus**: Älteste Commits = Farbe 1, neueste = Farbe 2, dazwischen linearer Farbverlauf
- **Activity-Bar-Panel**: Klick auf das Icon in der linken Leiste öffnet die Sidebar mit Modus-Auswahl und Farbkonfiguration
- **Color Picker**: Autorenfarben und Heat-Farben direkt aus der Sidebar wählbar
- **Hover-Info**: Mouseover über die Inline-Annotation zeigt Autor, E-Mail, Datum, Commit-Hash, Summary, Dateiverlauf und Links zu GitHub/GitLab
- **Commit-Vergleich**: Im Hover-Verlauf kann ein Commit angeklickt werden, um ihn per VS Code Diff gegen einen anderen zu vergleichen
- **Toggle-Command**: Ein-/Ausschalten per Befehl

## Modi

| Modus | Beschreibung |
|-------|-------------|
| **Author** | Jede E-Mail-Adresse bekommt eine eigene Farbe (Hash oder benutzerdefiniert) |
| **Heat** | Farbverlauf zwischen alt (Standard Blau) und neu (Standard Rot) |
| **Off** | Keine Annotierungen |

## Konfiguration

### gitBlameColor.mode
- Typ: `"author"` \| `"heat"` \| `"off"`
- Default: `"author"`
- Färbungsmodus

### gitBlameColor.enabled
- Typ: `boolean`
- Default: `true`
- Annotierungen beim Start aktivieren

### gitBlameColor.colors
- Typ: `object`
- Default: `{}`
- Benutzerdefinierte Farben pro E-Mail-Adresse (wird automatisch befüllt)

```json
{
  "gitBlameColor.colors": {
    "max.mustermann@example.com": "#FF5733"
  }
}
```

### gitBlameColor.heatColors
- Typ: `object`
- Default: `{ "old": "#2196F3", "new": "#F44336" }`
- Farben für den Heat-Modus (älteste ↔ neueste Commits)

## Commands

- `Git Blame Color: Toggle` – Annotierungen ein-/ausschalten
- `Git Blame Color: Show` – Autoren und ihre Farben für die aktive Datei anzeigen

## Entwicklung

```sh
npm install
npm run compile
```

In VS Code `F5` drücken → Extension Development Host öffnet sich.
