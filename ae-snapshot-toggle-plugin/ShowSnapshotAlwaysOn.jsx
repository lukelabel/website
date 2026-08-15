/*
  ShowSnapshotAlwaysOn.jsx

  An After Effects ScriptUI panel with a single "Keep Show Snapshot On"
  toggle. While on, it re-triggers the Show Snapshot command whenever the
  active viewer's context changes (comp, selected layer, or playhead time),
  since that's when After Effects is known to drop the snapshot overlay —
  so you don't have to keep re-pressing F5 every time you scrub or switch
  layers in the Layer panel.

  Install: copy this file into
    Adobe After Effects <version>/Scripts/ScriptUI Panels/
  then open it from After Effects via Window > ShowSnapshotAlwaysOn.jsx.
  (It also runs as a floating window via File > Scripts > Run Script File.)

  IMPORTANT — read README.md before relying on this. After Effects'
  scripting API has no documented command ID and no ViewOptions property
  for "Show Snapshot" (unlike checkerboards, exposure, zoom, etc., which
  ARE scriptable). On most installs app.findMenuCommandId() will not find
  it, and the toggle disables itself with an explanation rather than
  pretending to work. See README.md for the full explanation and what
  this script does when the command genuinely can't be found.
*/

// --- Global state -----------------------------------------------------
// These live at file/global scope (outside the UI-building IIFE below)
// because app.scheduleTask() evaluates its callback string in the
// engine's global scope — a function defined only inside the IIFE
// wouldn't be reachable from that string.

var snapshotKeeper_pollMs = 400;
var snapshotKeeper_live = false;
var snapshotKeeper_commandId = null;
var snapshotKeeper_lastKey = null;
var snapshotKeeper_statusText = null; // set by buildUI()

// Candidate menu-command labels to try, in order. AE has never publicly
// documented a command ID for this button, and it's usually a panel-only
// toggle with no menu entry at all — but if a future/localized AE build
// does expose one under a slightly different label, trying a short list
// costs nothing.
var SNAPSHOT_COMMAND_LABELS = ["Show Snapshot", "ShowSnapshot", "Show snapshot"];

function snapshotKeeper_hasScheduleTask() {
  return (typeof app.scheduleTask === "function");
}

function snapshotKeeper_findCommandId() {
  for (var i = 0; i < SNAPSHOT_COMMAND_LABELS.length; i++) {
    var id = app.findMenuCommandId(SNAPSHOT_COMMAND_LABELS[i]);
    if (id) return id;
  }
  return null;
}

function snapshotKeeper_setStatus(msg) {
  if (snapshotKeeper_statusText) {
    snapshotKeeper_statusText.text = msg;
  }
}

function snapshotKeeper_contextKey() {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) return null;

  var layerPart = "none";
  if (comp.selectedLayers && comp.selectedLayers.length > 0) {
    layerPart = comp.selectedLayers[0].index;
  }
  return comp.id + "/" + layerPart + "/" + comp.time.toFixed(4);
}

function snapshotKeeper_reassert() {
  if (!snapshotKeeper_commandId) return;
  app.executeCommand(snapshotKeeper_commandId);
}

// --- Polling loop (self-rescheduling app.scheduleTask) -----------------
// Only re-fires the command when the viewer context actually changed
// (different comp, different selected layer, or the playhead moved).
// That's a heuristic for "AE likely just dropped the snapshot overlay" —
// there's no API to ask AE whether it's still showing, so re-firing on
// every tick regardless would flicker the overlay on/off for no reason.

function snapshotKeeper_tick() {
  if (!snapshotKeeper_live) return;

  var key = snapshotKeeper_contextKey();
  if (key === null) {
    snapshotKeeper_setStatus("Keep Show Snapshot On — waiting for a composition to be open/active.");
  } else {
    if (key !== snapshotKeeper_lastKey) {
      snapshotKeeper_lastKey = key;
      snapshotKeeper_reassert();
      snapshotKeeper_setStatus("On — re-asserted Show Snapshot at " + new Date().toLocaleTimeString() + ".");
    }
  }

  app.scheduleTask("snapshotKeeper_tick()", snapshotKeeper_pollMs, false);
}

// --- UI ------------------------------------------------------------

(function showSnapshotAlwaysOnPanel(thisObj) {

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Show Snapshot Always On", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 16;

    var liveCheckbox = win.add("checkbox", undefined, "Keep Show Snapshot On");
    liveCheckbox.helpTip = "While on, re-triggers Show Snapshot whenever the active " +
      "comp, selected layer, or playhead time changes in the Layer panel.";

    var canSchedule = snapshotKeeper_hasScheduleTask();
    snapshotKeeper_commandId = canSchedule ? snapshotKeeper_findCommandId() : null;

    var status = win.add("statictext", undefined, "", { multiline: true });
    status.preferredSize.width = 230;
    status.preferredSize.height = 46;
    snapshotKeeper_statusText = status;

    if (!canSchedule) {
      liveCheckbox.enabled = false;
      status.text = "This After Effects version doesn't support auto-polling " +
        "(app.scheduleTask), so this can't run in the background.";
    } else if (!snapshotKeeper_commandId) {
      liveCheckbox.enabled = false;
      status.text = "This After Effects version doesn't expose \"Show Snapshot\" " +
        "to scripts — there's no menu command ID or DOM property for it, so it " +
        "can't be automated here. Use the F5 shortcut / panel button manually. " +
        "See README.md for details.";
    } else {
      status.text = "Off. Turn on to keep Show Snapshot re-asserted while you " +
        "work in the Layer panel.";
    }

    liveCheckbox.onClick = function () {
      snapshotKeeper_live = liveCheckbox.value;
      if (snapshotKeeper_live) {
        snapshotKeeper_lastKey = null; // force an immediate reassert on the next tick
        snapshotKeeper_tick();
      } else {
        snapshotKeeper_setStatus("Off. This does not hide the snapshot — it just " +
          "stops re-asserting it.");
      }
    };

    win.layout.layout(true);
    win.layout.resize();
    return win;
  }

  var panel = buildUI(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }

})(this);
