# Character Sheet Templates

Place your high-resolution sheet artwork inside this folder so the PDF export utility can embed it. The default generator looks for `dnd-5e-sheet.jpg`, matching the 768x994 template you shared. Swap the file (or update `DEFAULT_CHARACTER_SHEET_TEMPLATE` in `lib/export/character-sheet-template.ts`) to target a different asset.

> **Heads-up:** when we add support for custom PDFs, this same directory will host reference documents (for example `my-homebrew.pdf`). Keep everything under `public/templates` so the files remain accessible to the Next.js App Router.
