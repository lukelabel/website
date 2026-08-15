# AE ↔ Photoshop Draw Bridge

Two ScriptUI panels — one for After Effects, one for Photoshop — that let
you sketch notes, feedback, or animatic linework in Photoshop over a
reference of your live AE comp, then send the drawing back into the
composition as its own layer, without ever using AE's native Paint tool.

- **AEDrawBridge.jsx** exports the active comp's current frame for
  Photoshop to see, and imports any drawings Photoshop sends back as new
  layers.
- **PSDrawBridge.jsx** shows that frame as a locked reference layer, gives
  you a **New Drawing Layer** button for a fresh transparent canvas to
  paint on with any Photoshop brush (full pressure sensitivity, since
  it's Photoshop's own brush engine), and a **Send to After Effects**
  button that ships the drawing back.

The two panels talk to each other through a small folder on disk
(`~/Documents/AE-PS-Draw-Bridge/`) rather than a network connection —
both apps run on the same machine, so plain files are the simplest
reliable transport. No CEP packaging, plugin signing, servers, or ports
to set up.

## Please read before installing: what this actually is

This is **not** live video streaming between the two apps — no scripting
API on either side exposes that. It's frame-snapshot syncing:

- With **Live Bridge** checked in the AE panel, it re-exports the current
  frame to a shared file roughly every 700ms *if the comp or playhead
  time has changed* since the last export.
- With **Live Bridge** checked in the PS panel, it checks that same
  shared file roughly every 700ms and, if it's newer than what it last
  pulled in, replaces the reference layer with the new frame.

In practice that reads as a reference image that updates a few times a
second while you scrub or play back in AE — close enough to "see your
comp while you draw" for notes and animatic linework, but it is a
still-image refresh loop, not a synchronized video feed. Heavier comps
will lag further behind since each export is a real render.

The auto-refresh in both panels depends on `app.scheduleTask()`, an
ExtendScript timer API that's reliable in After Effects but whose
Photoshop support has varied across versions. Both panels detect whether
it's available at launch: if not, the **Live Bridge** checkbox disables
itself automatically and you fall back to the manual **Send Frame to
Photoshop** / **Refresh Frame Now** / **Check for Drawings** buttons,
which always work regardless of scheduleTask support.

I wasn't able to test this against a real After Effects + Photoshop
install while building it — please treat it as a working first version to
verify in your own setup, not a guaranteed-solid tool. If something
misbehaves, the manual buttons are the reliable fallback while you debug.

## Install

Both apps need **two files each**: the panel script and a shared copy of
`DrawBridgeShared.jsxinc` (the panel `#include`s it by relative path, so
it has to sit next to the panel file in the same folder).

**After Effects** — copy `AEDrawBridge.jsx` and `DrawBridgeShared.jsxinc` into:
- **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

**Photoshop** — copy `PSDrawBridge.jsx` and `DrawBridgeShared.jsxinc` into:
- **Mac:** `/Applications/Adobe Photoshop <version>/Presets/Scripts/ScriptUI Panels/`
- **Windows:** `C:\Program Files\Adobe\Adobe Photoshop <version>\Presets\Scripts\ScriptUI Panels\`

Restart both apps. Find the panels under **Window > AEDrawBridge.jsx** in
After Effects and **Window > PSDrawBridge.jsx** in Photoshop (drag either
tab into a dock to pin it). Both also run as floating windows via
**File > Scripts > Run Script File...** without installing, if you'd
rather try them that way first.

This bridge writes files to your Documents folder, so make sure scripts
are allowed to write to disk: **After Effects** — Preferences > Scripting
& Expressions > "Allow Scripts to Write Files and Access Network".
**Photoshop** doesn't gate this the same way, but if writes silently fail
there, check Preferences > Plug-ins for anything scripting-related your
version added.

## Usage

1. Open a composition in After Effects, open a document in Photoshop (or
   let the bridge create one for you in step 3).
2. In the **AE panel**, check **Live Bridge** — or click **Send Frame to
   Photoshop** once for a manual, one-off send.
3. In the **PS panel**, check **Live Bridge** — or click **Refresh Frame
   Now**. If no Photoshop document is open, one is created automatically,
   sized to match the comp, with the AE frame as a locked bottom layer
   named "AE Reference".
4. Click **New Drawing Layer** in the PS panel. A fresh transparent layer
   is added above the reference and made active — draw on it with
   whichever Photoshop brush you like, full pressure sensitivity included.
5. Click **Send to After Effects**. The active layer (only that one, with
   alpha preserved) is exported and picked up by the AE panel — live if
   Live Bridge is on there, or via **Check for Drawings** if you're
   working manually — and added as a new, comp-sized image layer at the
   top of the active comp's stack, named "PS Drawing", "PS Drawing 2", etc.
6. Click **New Drawing Layer** again any time to start a fresh sketch —
   each one you send becomes its own separate AE layer, so old notes
   stay put and can be toggled or deleted independently.

## Notes & limitations

- Snapshot-based, not live video — see the section above. Both panels'
  auto-refresh depends on `app.scheduleTask()`, which may not be
  available in every Photoshop version; the manual buttons always work.
- Both apps must run on the same machine — the bridge is a local folder,
  not a network service.
- Drawings sent to AE are static, comp-sized image layers spanning the
  full comp duration — good for notes, feedback, and animatic linework,
  not moving/animated artwork.
- "Send to After Effects" always sends whatever layer is currently active
  in Photoshop. Select the drawing layer you actually want to send before
  clicking it (the panel blocks accidentally sending the "AE Reference"
  layer itself).
- Only one reference frame and one AE project/comp are tracked at a time
  — if you switch comps in AE, the next export/import in Photoshop will
  reflect whichever comp is active.
- The bridge folder (`~/Documents/AE-PS-Draw-Bridge/`) accumulates
  imported drawings under `drawing-inbox/imported/` for reference; delete
  them any time, they aren't read again once imported.
