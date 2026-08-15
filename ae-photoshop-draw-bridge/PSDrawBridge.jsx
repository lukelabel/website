/*
  PSDrawBridge.jsx

  Half of a two-panel bridge between Photoshop and After Effects:
   - Pulls the current AE comp frame in as a locked, bottom-of-stack
     reference layer so you can see what you're drawing over.
   - "New Drawing Layer" gives you a fresh transparent layer to paint on
     with any Photoshop brush.
   - "Send to After Effects" exports the active drawing layer (alpha
     preserved) to the bridge folder for AEDrawBridge.jsx to pick up and
     add as a new layer in the comp.

  Install alongside DrawBridgeShared.jsx (this file needs it, via
  #include below) in:
    Adobe Photoshop <version>/Presets/Scripts/ScriptUI Panels/
  then open it from Photoshop via Window > Extensions (or Window >
  AEDrawBridge, depending on version) > PSDrawBridge.jsx.

  Install AEDrawBridge.jsx (+ its own copy of DrawBridgeShared.jsx) the
  same way in After Effects' Scripts/ScriptUI Panels folder — see
  README.md in this folder for the full setup/usage walkthrough and
  honest limitations (this is snapshot-based, not literally live video).
*/

#include "DrawBridgeShared.jsxinc"

// --- Global state -----------------------------------------------------
// Kept at file/global scope, outside the UI-building IIFE below, because
// app.scheduleTask() evaluates its callback string in the engine's
// global scope and wouldn't be able to reach a function defined only
// inside the IIFE's closure.

var psDrawBridge_pollMs = 700;
var psDrawBridge_live = false;
var psDrawBridge_lastSeenStamp = null;
var psDrawBridge_statusText = null; // set by buildUI()

function psDrawBridge_setStatus(msg) {
  if (psDrawBridge_statusText) {
    psDrawBridge_statusText.text = msg;
  }
}

function psDrawBridge_meta() {
  return drawBridgeReadJson(drawBridgeMetaFile());
}

function psDrawBridge_ensureDoc(meta) {
  if (app.documents.length > 0) return app.activeDocument;
  if (!meta) {
    alert('No AE frame received yet. Click "Refresh Frame Now" first ' +
      "(with the AE panel's Live Bridge or Send Frame running), or open " +
      "a document manually.");
    return null;
  }
  var w = new UnitValue(meta.width, "px");
  var h = new UnitValue(meta.height, "px");
  return app.documents.add(w, h, 72, "AE Draw Bridge", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
}

function psDrawBridge_updateReference(doc) {
  var frameFile = drawBridgeFrameFile();
  if (!frameFile.exists) return false;

  var refDoc = app.open(frameFile);
  refDoc.selection.selectAll();
  refDoc.selection.copy();
  refDoc.close(SaveOptions.DONOTSAVECHANGES);

  app.activeDocument = doc;
  doc.paste();
  var pasted = doc.activeLayer;
  pasted.name = "AE Reference";

  for (var i = doc.layers.length - 1; i >= 0; i--) {
    var l = doc.layers[i];
    if (l !== pasted && l.name === "AE Reference") {
      l.remove();
    }
  }

  pasted.move(doc, ElementPlacement.PLACEATEND);
  pasted.allLocked = true;
  return true;
}

function psDrawBridge_uniqueLayerName(doc, base) {
  var name = base;
  var suffix = 2;
  while (true) {
    var clash = false;
    for (var i = 0; i < doc.layers.length; i++) {
      if (doc.layers[i].name === name) {
        clash = true;
        break;
      }
    }
    if (!clash) return name;
    name = base + " " + suffix;
    suffix++;
  }
}

function psDrawBridge_newDrawingLayer(doc) {
  var name = psDrawBridge_uniqueLayerName(doc, "Drawing");
  var layer = doc.artLayers.add();
  layer.name = name;
  layer.move(doc, ElementPlacement.PLACEATBEGINNING);
  doc.activeLayer = layer;
  return layer;
}

function psDrawBridge_layerIndex(doc, target) {
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i] === target) return i;
  }
  return -1;
}

function psDrawBridge_sendToAE(doc, layer) {
  var idx = psDrawBridge_layerIndex(doc, layer);
  if (idx < 0) {
    alert("Could not locate the selected layer.");
    return false;
  }

  var tempDoc = doc.duplicate();
  var keep = tempDoc.layers[idx];
  for (var i = tempDoc.layers.length - 1; i >= 0; i--) {
    if (tempDoc.layers[i] !== keep) tempDoc.layers[i].remove();
  }

  var outFile = new File(drawBridgeInboxFolder().fsName + "/drawing-" + (new Date()).getTime() + ".png");

  var opts = new ExportOptionsSaveForWeb();
  opts.format = SaveDocumentType.PNG;
  opts.PNG8 = false;
  opts.transparency = true;

  tempDoc.exportDocument(outFile, ExportType.SAVEFORWEB, opts);
  tempDoc.close(SaveOptions.DONOTSAVECHANGES);

  app.activeDocument = doc;
  return true;
}

// --- Polling loop (self-rescheduling app.scheduleTask) -----------------

function psDrawBridge_tick() {
  if (!psDrawBridge_live) return;

  var meta = psDrawBridge_meta();
  if (meta && meta.stamp !== psDrawBridge_lastSeenStamp) {
    var doc = psDrawBridge_ensureDoc(meta);
    if (doc) {
      psDrawBridge_updateReference(doc);
      psDrawBridge_lastSeenStamp = meta.stamp;
    }
    psDrawBridge_setStatus('Live — reference updated ("' + meta.compName + '" @ ' + meta.time.toFixed(2) + "s).");
  } else if (meta) {
    psDrawBridge_setStatus('Live — up to date ("' + meta.compName + '" @ ' + meta.time.toFixed(2) + "s).");
  } else {
    psDrawBridge_setStatus("Live — waiting for a frame from After Effects.");
  }

  app.scheduleTask("psDrawBridge_tick()", psDrawBridge_pollMs, false);
}

// --- UI ------------------------------------------------------------

(function psDrawBridgePanel(thisObj) {

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "PS Draw Bridge", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 16;

    var liveCheckbox = win.add("checkbox", undefined, "Live Bridge");
    liveCheckbox.helpTip = "While on, automatically pulls in the latest " +
      "AE frame as the reference layer whenever After Effects sends a " +
      "new one, roughly every " + psDrawBridge_pollMs + "ms.";

    var canSchedule = drawBridgeHasScheduleTask();
    liveCheckbox.enabled = canSchedule;

    liveCheckbox.onClick = function () {
      psDrawBridge_live = liveCheckbox.value;
      if (psDrawBridge_live) {
        psDrawBridge_lastSeenStamp = null; // force a refresh on the next tick
        psDrawBridge_tick();
      } else {
        psDrawBridge_setStatus("Live Bridge off. Use the buttons below to sync manually.");
      }
    };

    var buttonGroup = win.add("group");
    buttonGroup.orientation = "column";
    buttonGroup.alignChildren = ["fill", "top"];

    var refreshBtn = buttonGroup.add("button", undefined, "Refresh Frame Now");
    refreshBtn.onClick = function () {
      var meta = psDrawBridge_meta();
      var doc = psDrawBridge_ensureDoc(meta);
      if (!doc) return;
      if (psDrawBridge_updateReference(doc)) {
        psDrawBridge_setStatus(meta
          ? 'Reference updated ("' + meta.compName + '" @ ' + meta.time.toFixed(2) + "s)."
          : "Reference updated.");
      } else {
        alert("No AE frame available yet — send one from the AE panel first.");
      }
    };

    var newLayerBtn = buttonGroup.add("button", undefined, "New Drawing Layer");
    newLayerBtn.onClick = function () {
      var meta = psDrawBridge_meta();
      var doc = psDrawBridge_ensureDoc(meta);
      if (!doc) return;
      var layer = psDrawBridge_newDrawingLayer(doc);
      psDrawBridge_setStatus('"' + layer.name + '" added and selected — draw with any brush.');
    };

    var sendBtn = buttonGroup.add("button", undefined, "Send to After Effects");
    sendBtn.onClick = function () {
      if (app.documents.length === 0) {
        alert("No document open.");
        return;
      }
      var doc = app.activeDocument;
      var layer = doc.activeLayer;
      if (!layer) {
        alert("Select the drawing layer you want to send first.");
        return;
      }
      if (layer.name === "AE Reference") {
        alert('That\'s the reference layer — select your drawing layer ' +
          'first (or click "New Drawing Layer").');
        return;
      }
      if (psDrawBridge_sendToAE(doc, layer)) {
        psDrawBridge_setStatus('"' + layer.name + '" sent to After Effects.');
      }
    };

    var status = win.add("statictext", undefined,
      canSchedule
        ? "Click Refresh Frame, then New Drawing Layer to start sketching."
        : "This PS version doesn't support auto-polling — use the buttons below.",
      { multiline: true });
    status.preferredSize.width = 230;
    status.preferredSize.height = 46;
    psDrawBridge_statusText = status;

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
