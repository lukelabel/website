# Pen Brush — After Effects Panel

A ScriptUI panel that makes the **Pen tool** feel closer to a brush. AE's
actual Brush/Paint tool only works in the Layer panel — the moment you
click with it, AE switches you out of the Composition viewer. The Pen tool
doesn't have that restriction: it draws directly in the Composition
viewer, on the actual comp, no panel-switching required. This script
handles the part the Pen tool doesn't: making the resulting path *look*
like a clean brush stroke instead of AE's default red fill+stroke shape.

It's a script, not a compiled plugin — no CEP packaging, signing, or Adobe
Developer Console setup required.

## Please read first: what this can and can't do

AE's scripting API (ExtendScript) has no way to hook mouse/drawing events
in the Composition viewer, and no way to set the Tools panel's default
Fill/Stroke swatch that the Pen tool uses for a brand-new path. That means
this script **cannot**:

- Make the Pen tool draw a pre-styled stroke live, in real time, as you drag.
- Switch you to the Pen tool automatically (same limitation as
  `ae-drawing-fade-panel`'s Brush tool note — press `G` yourself).

What it **can** do: draw first, then click a button. You use the Pen tool
exactly as AE provides it — click to place points, or click-and-drag
continuously for a rougher, more freehand line — and this panel restyles
the result afterward: fill removed, a clean round-cap/round-join stroke
applied in your chosen color and width. Draw another stroke, click the
button again. It's a two-step loop, not live painting, but it stays
entirely inside the Composition viewer the whole time.

## Install

Copy `PenBrush.jsx` into your After Effects Scripts folder:

- **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart After Effects. The panel appears under **Window > PenBrush.jsx**
(drag it to dock it like any other panel).

You can also run it as a floating window without installing, via
**File > Scripts > Run Script File...** and selecting `PenBrush.jsx`.

This script only touches the active project — no file or network I/O — so
it works regardless of your "Allow Scripts to Write Files and Access
Network" preference.

## Usage

1. **New Canvas Layer** — adds an empty shape layer and selects it. (Or
   skip this and draw on any shape layer you already have.)
2. Press **`G`** to select the Pen tool. In the Composition viewer:
   - Click to place points, double-click or hit `Enter` to finish an open
     stroke, or click the first point again to close it.
   - Or click-and-drag continuously for a rougher, hand-drawn line — AE
     keeps adding points as you move, closer to a real brush gesture.
3. Pick a **color** (Black/White/Red presets, or **Choose…** for AE's
   system color picker) and a **width** in pixels.
4. Select the layer (it likely still is) and click **Style as Brush
   Stroke**. Every path on the selected layer(s) gets its fill stripped
   and a round-cap stroke applied in that color/width.
5. Draw your next stroke — either a new path on the same layer, or a fresh
   **New Canvas Layer** — and click **Style as Brush Stroke** again. Color
   and width stay set from your last click, so repeat strokes are one
   button press.

## Notes & limitations

- "Style as Brush Stroke" styles *every* undecorated path it finds on each
  selected shape layer, so drawing several strokes on one layer before
  clicking it is fine — they all get styled together.
- Line caps and joins are always rounded (built for a soft brush look);
  there's no UI toggle for square/miter caps. Change them by hand in the
  Contents > Stroke properties afterward if you need something sharper.
- Re-running "Style as Brush Stroke" on an already-styled path just
  reapplies the current color/width/caps — safe to click again.
- The color picker button uses `$.colorPicker()`, AE's built-in ExtendScript
  system color dialog; there's no in-panel custom swatch picker beyond that.
