# Draw Layer — After Effects Panel

A dockable ScriptUI panel for After Effects with a single job: click
**Create** and get a comp-sized layer wired up for the built-in vector,
pressure-sensitive Paint (Brush) tool — a fast way to sketch notes, give
feedback, or block out animatics directly in the Composition viewer, with
the rest of your comp visible as reference the whole time.

After Effects has no native "sketch over the comp" command, so this script
sets one up out of native building blocks: a comp-sized Solid layer. Solids
are used instead of an empty shape layer because a Solid always has a real,
comp-sized bounding box — After Effects can hit-test your clicks directly
in the Composition panel and paint in place. An empty shape layer has no
bounding box to hit-test against, which is what pushes AE into the
isolated single-layer Layer panel view (losing sight of everything below)
instead of painting where you're looking. No CEP packaging, plugin
signing, or Adobe Developer Console setup required.

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
2. (Optional) Pick a **Fill color** — only matters if you skip step 4
   below, since with "Paint on Transparent" checked the fill never renders.
3. Click **Create**. A solid layer is added at the top of the stack and
   selected automatically.
4. Press `Ctrl+B` / `Cmd+B` to grab the Brush tool. **Check "Paint on
   Transparent"** in the Tools panel options bar — a one-time toggle per
   AE session — so the solid's own fill is left out of the render and only
   your strokes remain visible.
5. Paint directly in the **Composition** viewer (no need to double-click
   into the layer or open the Layer panel) — everything else in the comp
   stays visible underneath as you draw. Pressure sensitivity works the
   same as anywhere else in AE, based on your brush dynamics settings.

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

- AE's scripting API has no public command to switch the active tool or
  toggle "Paint on Transparent" for you — both are one-time manual steps
  per session (`Ctrl+B` / `Cmd+B`, then check the box in the options bar).
  "Paint on Transparent" isn't exposed as a scriptable layer property
  until after a stroke has been painted, so it can't be pre-set by the
  script either.
- Each click adds a new layer; the script never reuses or overwrites an
  existing draw layer, so old sketches stay put unless you delete them.
- If you forget to check "Paint on Transparent," the solid's fill color
  will show up in the render like a normal solid — pick black or white
  from the dropdown so it's at least easy to spot and fix, or delete the
  layer and start over once you remember the checkbox.
