# Show Snapshot Always On — After Effects Panel

A small ScriptUI panel with one control: a **Keep Show Snapshot On**
checkbox. While it's on, the panel watches the active viewer and
re-triggers the **Show Snapshot** command whenever the comp, the selected
layer, or the playhead time changes — the situations where After Effects
is known to drop the snapshot overlay — so you don't have to keep
re-pressing `F5` while working in the Layer panel.

It's a script, not a compiled plugin — no CEP packaging, signing, or Adobe
Developer Console setup required.

## Please read before installing: what this actually is

**On most After Effects installs, the checkbox will be disabled.** Here's
why, and please read this before filing a bug report that it "doesn't
work":

After Effects' scripting API exposes plenty of viewer settings as real,
readable/writable properties — `ViewOptions.checkerboards`,
`.exposure`, `.zoom`, `.rulers`, and so on. **"Show Snapshot" is not one of
them.** It has no DOM property anywhere in the object model. The only
other way scripts can drive AE's UI is `app.executeCommand()` with a menu
command ID looked up via `app.findMenuCommandId("...")` — but that only
works for commands that actually live in a menu. Show Snapshot is a
panel-toolbar button with a keyboard shortcut (`F5`, alongside `Shift+F5`
to take the snapshot), not a menu item, and a cross-version scan of
After Effects' menu command IDs (checked against every major release from
2015 through 2025) turns up no separate "Show Snapshot" entry at all — just
a single generic `"Snapshot"` command whose actual behavior is undocumented
and which this script deliberately does **not** guess at using, since
firing the wrong command repeatedly (e.g. one that *retakes* the snapshot
instead of showing it) would be worse than doing nothing.

So, honestly: **there is currently no supported way for an After Effects
script to detect or force the Show Snapshot state.** This panel is built
so that:

- On startup, it tries `app.findMenuCommandId()` with a short list of
  plausible label strings for the command. If Adobe ever exposes it (or
  a particular localized build already does), the checkbox lights up
  and works as described above.
- If no matching command ID is found — the expected outcome today — the
  checkbox stays **disabled** with a status message explaining why,
  instead of pretending to toggle something it can't actually control.

I wasn't able to test this against a real After Effects install with a
build that exposes the command while building it (none of the versions I
could check menu IDs for expose one) — please treat the "found it, it
works" path as an untested first version if you're ever on a build where
the checkbox actually enables itself.

## Install

Copy `ShowSnapshotAlwaysOn.jsx` into your After Effects Scripts folder:

- **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Restart After Effects. The panel appears under
**Window > ShowSnapshotAlwaysOn.jsx** (drag it to dock it like any other
panel).

You can also run it as a floating window without installing, via
**File > Scripts > Run Script File...** and selecting
`ShowSnapshotAlwaysOn.jsx`.

This script only reads the active comp/layer/time and (when possible)
executes one menu command — no file or network I/O, so AE's "Allow
Scripts to Write Files and Access Network" preference doesn't matter here.

## Usage

1. Open the panel and check its status text.
   - If it says the checkbox is disabled because Show Snapshot isn't
     exposed to scripts on your AE version, that's the current expected
     state — use the `F5` shortcut or the panel button manually instead.
   - If the checkbox is enabled, a working command ID was found.
2. If enabled, check **Keep Show Snapshot On**. The panel immediately
   re-asserts the command once, then keeps watching the active comp,
   selected layer, and playhead time (roughly every 400ms) and re-fires
   the command any time one of those changes.
3. Uncheck it to stop the watchdog. Unchecking does **not** hide the
   snapshot itself — it just stops re-asserting it — since there's no
   reliable way for the script to know whether doing so would turn it on
   or off.

## Notes & limitations

- Re-asserting only happens when the tracked context (comp id + selected
  layer index + playhead time) changes, not on every poll tick — this
  avoids flickering the overlay on and off in a stable viewer. It's a
  heuristic, not a guarantee: AE may drop the overlay for reasons this
  script isn't watching for (e.g. switching panel tabs), and conversely
  it may re-fire the command in a context change that didn't actually
  drop the overlay.
- The auto-refresh depends on `app.scheduleTask()`, an ExtendScript timer
  API. If it's unavailable in your AE version, the checkbox disables
  itself and explains why, the same way the command-ID check does.
- This only tracks the layer selected in the active composition, since
  AE's scripting API doesn't expose which specific layer a Layer panel is
  currently showing.
