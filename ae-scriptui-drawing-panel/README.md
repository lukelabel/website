# Draw Layer — After Effects Panel

A dockable ScriptUI panel for After Effects with a single job: click
**Create** and get a blank, transparent, comp-sized layer wired up for the
built-in vector, pressure-sensitive Paint (Brush) tool — a fast way to
sketch notes, give feedback, or block out animatics directly over your
composition without disturbing the layers underneath.

After Effects has no native "sketch over the comp" command, so this script
sets one up out of native building blocks: an empty shape layer, which is
fully transparent by default and accepts brush strokes directly. No CEP
packaging, plugin signing, or Adobe Developer Console setup required.

## Install

Copy `CreateDrawLayer.jsx` into your After Effects Scripts folder:

- **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart After Effects. The panel appears under **Window > CreateDrawLayer.jsx**
— drag its tab into any dock to pin it alongside your other panels.

You can also run it without installing, via **File > Scripts > Run Script
File...** and selecting `CreateDrawLayer.jsx`; it opens as a floating
window instead of a dockable panel.

This script only touches the active project (adding a layer) — no file or
network I/O — so it works even with scripting file/network access left off
in Preferences.

## Usage

With a composition open:

1. (Optional) Change the **Layer name** field — defaults to "Draw". If a
   layer with that name already exists, the new one is automatically
   suffixed ("Draw 2", "Draw 3", ...).
2. Click **Create**. A transparent shape layer is added at the top of the
   stack and selected automatically.
3. Press `Ctrl+B` / `Cmd+B` to grab the Brush tool, then paint directly on
   the canvas. Pressure sensitivity works the same as anywhere else in AE,
   based on your brush dynamics settings.

Click **Create** again any time to start a fresh drawing layer — handy for
separating rounds of notes, or giving a new idea its own layer you can
toggle visibility on/off independently.

### Limit to 48 frames

Check **Limit to 48 frames** before clicking Create to trim the new layer
to a 48-frame span starting at the playhead, instead of the full comp
duration (clamped to the comp's end if the playhead is near it). Move the
playhead and click Create again to start another 48-frame layer — handy
for giving each beat of an animatic its own bounded drawing layer instead
of one sketch stretching across the whole timeline.

## Notes & limitations

- AE's scripting API has no public command to switch the active tool, so
  the panel can't auto-select the Brush tool for you — use `Ctrl+B` /
  `Cmd+B`, or click it in the Tools panel, after creating a layer.
- Each click adds a new layer; the script never reuses or overwrites an
  existing draw layer, so old sketches stay put unless you delete them.
- Shape layers created this way have no shape content of their own — the
  brush strokes you paint are the only thing on the layer, so you get a
  clean transparent canvas with no fill to clear out first.
