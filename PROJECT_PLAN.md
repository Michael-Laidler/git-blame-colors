# Git Blame Color Extension

Eine VS Code Extension, die `git blame` nutzt, um Codezeilen basierend auf dem Autor farblich zu markieren.

## Features

- Farbliche Markierung von Codezeilen basierend auf dem Git-Autor
- Benutzerdefinierte Farben in VS Code Settings
- Standardfarben werden per Hash aus dem Benutzernamen berechnet
- Toggle zum Ein-/Ausschalten der Annotationen
- Hover-Informationen mit Autor und Commit-Datum

## Plan

1. **Projektstruktur erstellen**
   - `package.json` - Extension Metadata & Dependencies
   - `tsconfig.json` - TypeScript Konfiguration
   - `src/extension.ts` - Haupt-Entry-Point
   - `src/gitBlame.ts` - Git Blame Parser
   - `src/decorator.ts` - Dekoration der Zeilen
   - `src/colorGenerator.ts` - Hash-basierte Farbgenerierung
   - `src/configuration.ts` - Settings-Handling
   - `.vscodeignore` - Ignorierte Dateien

2. **Implementierung**
   - Extension registration & commands
   - Git blame execution & parsing
   - Decorator für farbige Gutter-Annotationen
   - Farbgenerierung via Hash
   - Settings integration

3. **Konfiguration**
   - `contributes.configuration` in package.json
   - Settings: `gitBlameColor.colors`
   - Settings: `gitBlameColor.enabled`
