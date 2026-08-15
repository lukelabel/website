/*
  AEDrawBridge.jsx

  Half of a two-panel bridge between After Effects and Photoshop:
   - Exports the active comp's current frame as a reference image for
     Photoshop to draw over.
   - Watches for drawings Photoshop sends back and imports each one as a
     new, comp-sized image layer at the top of the stack.

  Install: copy this single file into
    Adobe After Effects <version>/Scripts/ScriptUI Panels/
  then open it from After Effects via Window > AEDrawBridge.jsx (drag the
  tab to dock it like any other panel).

  It also runs as a floating window via File > Scripts > Run Script
  File... without installing anything.

  Install PSDrawBridge.jsx in Photoshop's Presets/Scripts folder (not a
  ScriptUI Panels subfolder — Photoshop has no equivalent auto-docking
  convention, so it runs from File > Scripts > PSDrawBridge as a floating
  window instead of a docked panel) — see README.md in this folder for
  the full setup/usage walkthrough and honest limitations (this is
  snapshot-based, not literally live video).
*/

// --- Bridge folder helpers ----------------------------------------
// Both panels read/write this same folder on disk to hand frames and
// drawings back and forth — no server process, ports, or CEP tooling.

function drawBridgeFolder() {
  var f = new Folder(Folder.myDocuments.fsName + "/AE-PS-Draw-Bridge");
  if (!f.exists) f.create();
  return f;
}

function drawBridgeInboxFolder() {
  var f = new Folder(drawBridgeFolder().fsName + "/drawing-inbox");
  if (!f.exists) f.create();
  return f;
}

function drawBridgeInboxImportedFolder() {
  var f = new Folder(drawBridgeInboxFolder().fsName + "/imported");
  if (!f.exists) f.create();
  return f;
}

function drawBridgeFrameFile() {
  return new File(drawBridgeFolder().fsName + "/latest-frame.png");
}

function drawBridgeMetaFile() {
  return new File(drawBridgeFolder().fsName + "/latest-frame.json");
}

function drawBridgeWriteText(file, text) {
  file.encoding = "UTF-8";
  file.open("w");
  file.write(text);
  file.close();
}

function drawBridgeWriteJson(file, obj) {
  drawBridgeWriteText(file, JSON.stringify(obj));
}

function drawBridgeHasScheduleTask() {
  return (typeof app.scheduleTask === "function");
}

// --- Global state -----------------------------------------------------
// These live at file/global scope (outside the UI-building IIFE below)
// because app.scheduleTask() evaluates its callback string in the
// engine's global scope — a function defined only inside the IIFE
// wouldn't be reachable from that string.

var aeDrawBridge_pollMs = 700;
var aeDrawBridge_live = false;
var aeDrawBridge_lastExportKey = null;
var aeDrawBridge_statusText = null; // set by buildUI()

function aeDrawBridge_activeComp() {
  var item = app.project.activeItem;
  return (item instanceof CompItem) ? item : null;
}

function aeDrawBridge_setStatus(msg) {
  if (aeDrawBridge_statusText) {
    aeDrawBridge_statusText.text = msg;
  }
}

function aeDrawBridge_exportFrame(force) {
  var comp = aeDrawBridge_activeComp();
  if (!comp) return false;

  var key = comp.id + "@" + comp.time.toFixed(4);
  if (!force && key === aeDrawBridge_lastExportKey) return false;

  var frameFile = drawBridgeFrameFile();
  comp.saveFrameToPng(comp.time, frameFile);

  drawBridgeWriteJson(drawBridgeMetaFile(), {
    compName: comp.name,
    time: comp.time,
    width: comp.width,
    height: comp.height,
    frameRate: comp.frameRate,
    stamp: (new Date()).getTime()
  });

  aeDrawBridge_lastExportKey = key;
  return true;
}

function aeDrawBridge_uniqueLayerName(comp, base) {
  var name = base;
  var suffix = 2;
  while (true) {
    var clash = false;
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === name) {
        clash = true;
        break;
      }
    }
    if (!clash) return name;
    name = base + " " + suffix;
    suffix++;
  }
}

function aeDrawBridge_importDrawing(comp, file) {
  var importOptions = new ImportOptions(file);
  var footage = app.project.importFile(importOptions);
  footage.parentFolder = app.project.rootFolder;

  var layer = comp.layers.add(footage);
  layer.name = aeDrawBridge_uniqueLayerName(comp, "PS Drawing");
  layer.moveToBeginning();
  return layer;
}

function aeDrawBridge_checkForDrawings() {
  var comp = aeDrawBridge_activeComp();
  if (!comp) return 0;

  var inbox = drawBridgeInboxFolder();
  var importedFolder = drawBridgeInboxImportedFolder();
  var files = inbox.getFiles("*.png");
  var count = 0;

  if (!files || files.length === 0) return 0;

  app.beginUndoGroup("Import Photoshop Drawing(s)");
  try {
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f instanceof File) {
        aeDrawBridge_importDrawing(comp, f);
        f.copy(importedFolder.fsName + "/" + f.name);
        f.remove();
        count++;
      }
    }
  } finally {
    app.endUndoGroup();
  }
  return count;
}

// --- Polling loop (self-rescheduling app.scheduleTask) -----------------

function aeDrawBridge_tick() {
  if (!aeDrawBridge_live) return;

  var comp = aeDrawBridge_activeComp();
  if (comp) {
    var exported = aeDrawBridge_exportFrame(false);
    var imported = aeDrawBridge_checkForDrawings();
    aeDrawBridge_setStatus('Live — "' + comp.name + '" @ ' + comp.time.toFixed(2) + "s" +
      (exported ? " (frame sent)" : "") +
      (imported > 0 ? " (" + imported + " drawing" + (imported > 1 ? "s" : "") + " imported)" : ""));
  } else {
    aeDrawBridge_setStatus("Live — waiting for a composition to be open/active.");
  }

  app.scheduleTask("aeDrawBridge_tick()", aeDrawBridge_pollMs, false);
}

// --- UI ------------------------------------------------------------

(function aeDrawBridgePanel(thisObj) {

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "AE Draw Bridge", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 16;

    var liveCheckbox = win.add("checkbox", undefined, "Live Bridge");
    liveCheckbox.helpTip = "While on, automatically sends the current comp " +
      "frame to Photoshop and imports any drawings Photoshop sends back, " +
      "roughly every " + aeDrawBridge_pollMs + "ms.";

    var canSchedule = drawBridgeHasScheduleTask();
    liveCheckbox.enabled = canSchedule;

    liveCheckbox.onClick = function () {
      aeDrawBridge_live = liveCheckbox.value;
      if (aeDrawBridge_live) {
        aeDrawBridge_lastExportKey = null; // force a fresh export on the next tick
        aeDrawBridge_tick();
      } else {
        aeDrawBridge_setStatus("Live Bridge off. Use the buttons below to sync manually.");
      }
    };

    var buttonGroup = win.add("group");
    buttonGroup.orientation = "column";
    buttonGroup.alignChildren = ["fill", "top"];

    var exportBtn = buttonGroup.add("button", undefined, "Send Frame to Photoshop");
    exportBtn.onClick = function () {
      var comp = aeDrawBridge_activeComp();
      if (!comp) {
        alert("Select or open a composition first.");
        return;
      }
      aeDrawBridge_exportFrame(true);
      aeDrawBridge_setStatus('Sent frame from "' + comp.name + '" @ ' + comp.time.toFixed(2) + "s.");
    };

    var checkBtn = buttonGroup.add("button", undefined, "Check for Drawings");
    checkBtn.onClick = function () {
      var comp = aeDrawBridge_activeComp();
      if (!comp) {
        alert("Select or open a composition first.");
        return;
      }
      var count = aeDrawBridge_checkForDrawings();
      aeDrawBridge_setStatus(count > 0
        ? count + " drawing" + (count > 1 ? "s" : "") + " imported into \"" + comp.name + "\"."
        : "No new drawings waiting.");
    };

    var status = win.add("statictext", undefined,
      canSchedule
        ? "Open a comp, then check Live Bridge or use the buttons below."
        : "This AE version doesn't support auto-polling — use the buttons below.",
      { multiline: true });
    status.preferredSize.width = 230;
    status.preferredSize.height = 46;
    aeDrawBridge_statusText = status;

    win.layout.layout(true);
    win.layout.resize();
    return win;
  }

  try {
    var panel = buildUI(thisObj);
    if (panel instanceof Window) {
      panel.center();
      panel.show();
    }
  } catch (e) {
    alert("AE Draw Bridge failed to open:\n\n" + e.toString() +
      (e.line ? ("\n\n(line " + e.line + ")") : ""));
  }

})(this);
