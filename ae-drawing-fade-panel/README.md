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

## Usage

With a composition open:

- **Create Draw Layer** — adds an empty, transparent shape layer named
  "Draw Layer" at the top of the stack. Select it, press `Ctrl+B` /
  `Cmd+B` to switch to the Brush tool, and paint directly on it. Because
  it's a shape layer with no shape content, it starts fully transparent —
  your strokes are the only thing on it. Brush pressure sensitivity works
  the same as anywhere else in AE (tablet pressure maps to stroke size/
  opacity depending on your brush dynamics settings).

- **Create Fade Layer** — adds a comp-size solid ("Fade Fill") with a
  Slider Control effect named "Fade Amount". The layer's opacity is
  expression-linked to that slider (0–100 maps 1:1 to opacity), so raising
  the slider in the Effect Controls panel fades the fill in over whatever
  is beneath it in the stack. Pick black or white fill from the dropdown
  before clicking.

- **Create Both (stacked)** — does both in one step, ordered correctly:
  Draw Layer on top, Fade Fill directly below it, both above the rest of
  your comp. That way your drawing always stays fully visible while the
  fade fill dims/hides the layers underneath.

## Notes & limitations

- AE's scripting API has no public command to switch the active tool, so
  the panel can't auto-select the Brush tool for you — use `Ctrl+B`/`Cmd+B`
  or click it in the Tools panel after creating the Draw Layer.
- The fade slider is a completely standard Slider Control effect, so it
  keyframes, expression-links, and shows up in the Graph Editor exactly
  like any other effect parameter.
- Re-running any button just adds another layer; it doesn't reuse or
  overwrite an existing Draw Layer / Fade Fill.
