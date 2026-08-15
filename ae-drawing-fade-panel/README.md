# Draw & Fade — After Effects Panel

A small ScriptUI panel for After Effects that sets up two things quickly:

1. **A blank layer to draw on** with AE's built-in vector, pressure-sensitive
   Paint (Brush) tool.
2. **A comp-size fill layer with a fade slider** that shows up in the
   Effect Controls panel, so you can dial the opacity of everything
   underneath your drawing up and down.

It's a script, not a compiled plugin — no CEP packaging, signing, or Adobe
Developer Console setup required. It wires up native AE features (the Paint
tool and the Slider Control effect) rather than reimplementing them.

## Install

Copy `DrawAndFade.jsx` into your After Effects Scripts folder:

- **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart After Effects. The panel appears under **Window > DrawAndFade.jsx**
(drag it to dock it like any other panel).

You can also run it as a floating window without installing, via
**File > Scripts > Run Script File...** and selecting `DrawAndFade.jsx`.

If your AE preferences don't allow scripts to write to disk/network by
default, that doesn't matter here — this script only touches the active
project, no file or network I/O.

## Important: how painting actually works in AE

After Effects' Brush/Clone Stamp/Eraser tools can **only** apply strokes in
the **Layer panel** — never directly in the Composition panel. This is a
hard limitation of After Effects itself (confirmed in Adobe's own docs and
community threads), not something this panel, or any script/CEP/UXP
extension, can change. The Layer panel is also inherently a single-layer
viewer, so on its own it can't show the other layers composited behind the
one you're painting.

The closest native workaround — and what this panel automates — is AE's
built-in **Paint workspace** (`Window > Workspace > Paint`), which docks
the Layer panel next to the Composition panel. You paint in the Layer
panel; the Composition panel beside it shows the full composite as
reference, refreshing after each stroke completes (not continuously while
you drag).

## Usage

With a composition open:

- **Create Draw Layer** — adds an empty, transparent shape layer named
  "Draw Layer" at the top of the stack, selects it, opens its Layer panel,
  and switches to the Paint workspace so the Composition panel sits beside
  it as reference. Press `Ctrl+B`/`Cmd+B` to switch to the Brush tool, then
  paint in the Layer panel. Because it's a shape layer with no shape
  content, it starts fully transparent — your strokes are the only thing
  on it. Brush pressure sensitivity works the same as anywhere else in AE
  (tablet pressure maps to stroke size/opacity depending on your brush
  dynamics settings).

- **Create Fade Layer** — adds a comp-size solid ("Fade Fill") with a
  Slider Control effect named "Fade Amount". The layer's opacity is
  expression-linked to that slider (0–100 maps 1:1 to opacity), so raising
  the slider in the Effect Controls panel fades the fill in over whatever
  is beneath it in the stack. Pick black or white fill from the dropdown
  before clicking.

- **Create Both (stacked)** — does both in one step, ordered correctly:
  Draw Layer on top, Fade Fill directly below it, both above the rest of
  your comp. That way your drawing always stays fully visible while the
  fade fill dims/hides the layers underneath. Also sets up the Draw Layer
  for painting, same as above.

- **Open for Painting** — re-opens the paint-friendly layout (Layer panel
  + Paint workspace) on an existing Draw Layer, without creating a new one.
  Uses whichever single layer is currently selected in the timeline, or
  falls back to a layer named "Draw Layer" if none is selected. Useful
  after closing the Layer panel, changing workspaces, or reopening the
  project.

## Notes & limitations

- AE's scripting API has no public command to switch the active tool, so
  the panel can't auto-select the Brush tool for you — use `Ctrl+B`/`Cmd+B`
  or click it in the Tools panel once the Layer panel is open.
- Switching to the Paint workspace uses `app.findMenuCommandId("Paint")`,
  which matches by menu label — it's English-UI-only and depends on the
  built-in "Paint" workspace still existing under that name. If it fails,
  the panel shows an alert; just pick `Window > Workspace > Paint`
  manually and the Layer panel that was already opened will be right there.
- The fade slider is a completely standard Slider Control effect, so it
  keyframes, expression-links, and shows up in the Graph Editor exactly
  like any other effect parameter.
- Re-running any button just adds another layer; it doesn't reuse or
  overwrite an existing Draw Layer / Fade Fill.
