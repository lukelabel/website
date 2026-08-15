/*
  CreateDrawLayer.jsx

  A dockable After Effects ScriptUI panel with one job: click "Create" and
  get a blank, transparent, comp-sized layer ready for the built-in
  pressure-sensitive Paint (Brush) tool — a fast way to sketch notes,
  annotations, or animatic linework directly over your composition without
  touching the layers underneath.

  Install: copy this file into
    Adobe After Effects <version>/Scripts/ScriptUI Panels/
  then open it from After Effects via Window > CreateDrawLayer.jsx
  (drag the tab to dock it like any other panel).

  It also runs as a floating window via File > Scripts > Run Script File...
  without installing anything.

  See README.md in this folder for usage notes and limitations.
*/

(function createDrawLayerPanel(thisObj) {

  var BASE_NAME_DEFAULT = "Draw";
  var LIMITED_SPAN_FRAMES = 48;

  function getActiveComp() {
    var item = app.project.activeItem;
    if (!(item instanceof CompItem)) {
      alert("Select or open a composition first.");
      return null;
    }
    return item;
  }

  function uniqueLayerName(comp, base) {
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

  function deselectAll(comp) {
    for (var i = 1; i <= comp.numLayers; i++) {
      comp.layer(i).selected = false;
    }
  }

  function createDrawLayer(comp, baseName, limitSpan) {
    // An empty shape layer is fully transparent by default and supports
    // the Paint tool directly, so it's a clean canvas for brush strokes
    // with nothing to mask or clear out first.
    var layer = comp.layers.addShape();
    layer.name = uniqueLayerName(comp, baseName || BASE_NAME_DEFAULT);

    if (limitSpan) {
      var frameDuration = 1 / comp.frameRate;
      var spanEnd = comp.time + (LIMITED_SPAN_FRAMES * frameDuration);
      layer.startTime = 0;
      layer.inPoint = comp.time;
      layer.outPoint = Math.min(spanEnd, comp.duration);
    }

    deselectAll(comp);
    layer.selected = true;

    return layer;
  }

  function onCreate(baseName, limitSpan) {
    var comp = getActiveComp();
    if (!comp) return;

    var layer;
    app.beginUndoGroup("Create Draw Layer");
    try {
      layer = createDrawLayer(comp, baseName, limitSpan);
    } finally {
      app.endUndoGroup();
    }

    // AE's scripting API has no public command to switch the active tool,
    // so the panel can't auto-select the Brush tool — a one-time nudge in
    // the status line is the best we can do.
    return layer;
  }

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Draw Layer", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 16;

    var nameGroup = win.add("group");
    nameGroup.add("statictext", undefined, "Layer name:");
    var nameInput = nameGroup.add("edittext", undefined, BASE_NAME_DEFAULT);
    nameInput.characters = 14;

    var frameCheckbox = win.add("checkbox", undefined, "Limit to 48 frames");
    frameCheckbox.helpTip = "Trims the new layer to 48 frames starting at " +
      "the playhead — click Create again further down the timeline to " +
      "start a fresh 48-frame drawing layer, animatic-beat style.";
    frameCheckbox.value = false;

    var createBtn = win.add("button", undefined, "Create");
    createBtn.onClick = function () {
      var baseName = (nameInput.text || "").replace(/^\s+|\s+$/g, "");
      var layer = onCreate(baseName || BASE_NAME_DEFAULT, frameCheckbox.value);
      if (layer) {
        status.text = '"' + layer.name + '" added and selected. ' +
          "Press Ctrl+B / Cmd+B to grab the Brush tool, then paint.";
      }
    };

    var status = win.add("statictext", undefined,
      "Open a comp and click Create to add a transparent layer to draw on.",
      { multiline: true });
    status.preferredSize.width = 200;
    status.preferredSize.height = 46;

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
