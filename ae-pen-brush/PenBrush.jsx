/*
  PenBrush.jsx

  An After Effects ScriptUI panel that makes the Pen tool feel closer to a
  brush: draw directly in the Composition viewer with the Pen tool (which,
  unlike the Brush/Paint tool, doesn't force you into the Layer panel),
  then click one button to strip AE's default red fill/stroke appearance
  and restyle the path as a clean, rounded-cap colored line.

  It cannot make the Pen tool draw pre-styled strokes live, or switch tools
  for you — AE's scripting API exposes neither. See README.md for details.

  Install: copy this file into
    Adobe After Effects <version>/Scripts/ScriptUI Panels/
  then open it from After Effects via Window > PenBrush.jsx.
  (It also runs as a floating window via File > Scripts > Run Script File.)
*/

(function penBrush(thisObj) {

  var CANVAS_LAYER_NAME = "Pen Brush Canvas";
  var DEFAULT_WIDTH = 8;
  var LINE_CAP_ROUND = 2;
  var LINE_JOIN_ROUND = 2;

  function getActiveComp() {
    var item = app.project.activeItem;
    if (!(item instanceof CompItem)) {
      alert("Select or open a composition first.");
      return null;
    }
    return item;
  }

  function withUndoGroup(name, fn) {
    app.beginUndoGroup(name);
    try {
      fn();
    } finally {
      app.endUndoGroup();
    }
  }

  // --- Canvas layer ---------------------------------------------------------

  function onNewCanvasLayer() {
    var comp = getActiveComp();
    if (!comp) return;
    withUndoGroup("New Pen Brush Canvas", function () {
      var layer = comp.layers.addShape();
      layer.name = CANVAS_LAYER_NAME;
      layer.selected = true;
    });
    alert('Canvas layer added and selected. Press "G" for the Pen tool, then ' +
      "either click to place points (double-click or Enter to finish a stroke), " +
      "or click-and-drag continuously for a rougher freehand line. " +
      'When you\'re done with a stroke, click "Style as Brush Stroke" below.');
  }

  // --- Find path groups inside a shape layer's contents ----------------------

  function findPathGroups(propertyGroup, results) {
    var hasPath = false;
    for (var i = 1; i <= propertyGroup.numProperties; i++) {
      var prop = propertyGroup.property(i);
      if (prop.matchName === "ADBE Vector Shape - Group") {
        hasPath = true;
      } else if (prop.matchName === "ADBE Vector Group") {
        findPathGroups(prop.property("ADBE Vectors Group"), results);
      }
    }
    if (hasPath) results.push(propertyGroup);
  }

  // --- Style a single path group as a brush stroke ----------------------------

  function styleGroupAsBrush(contentsGroup, colorRgb, widthPx) {
    for (var i = contentsGroup.numProperties; i >= 1; i--) {
      var prop = contentsGroup.property(i);
      if (prop.matchName === "ADBE Vector Graphic - Fill") prop.remove();
    }

    var stroke = null;
    for (var j = 1; j <= contentsGroup.numProperties; j++) {
      if (contentsGroup.property(j).matchName === "ADBE Vector Graphic - Stroke") {
        stroke = contentsGroup.property(j);
        break;
      }
    }
    if (!stroke) stroke = contentsGroup.addProperty("ADBE Vector Graphic - Stroke");

    stroke.property("ADBE Vector Stroke Color").setValue([colorRgb[0], colorRgb[1], colorRgb[2], 1]);
    stroke.property("ADBE Vector Stroke Width").setValue(widthPx);
    stroke.property("ADBE Vector Stroke Line Cap").setValue(LINE_CAP_ROUND);
    stroke.property("ADBE Vector Stroke Line Join").setValue(LINE_JOIN_ROUND);
  }

  function onStyleAsBrush(colorRgb, widthPx) {
    var comp = getActiveComp();
    if (!comp) return;

    var layers = comp.selectedLayers;
    if (layers.length === 0) {
      alert("Select the shape layer you just drew on first.");
      return;
    }

    var styledGroups = 0, layersWithNoPath = 0;
    withUndoGroup("Style as Brush Stroke", function () {
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (!(layer instanceof ShapeLayer)) { layersWithNoPath++; continue; }

        var groups = [];
        findPathGroups(layer.property("ADBE Root Vectors Group"), groups);
        if (groups.length === 0) { layersWithNoPath++; continue; }

        for (var g = 0; g < groups.length; g++) {
          styleGroupAsBrush(groups[g], colorRgb, widthPx);
          styledGroups++;
        }
      }
    });

    if (styledGroups === 0) {
      alert("No path found on the selected layer(s). Draw with the Pen tool first.");
    } else if (layersWithNoPath > 0) {
      alert(styledGroups + " stroke(s) styled. " + layersWithNoPath + " layer(s) skipped (not a shape layer, or no path drawn on it).");
    }
  }

  // --- UI ---------------------------------------------------------------------

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Pen Brush", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 16;

    var currentColor = [0, 0, 0]; // black

    var canvasBtn = win.add("button", undefined, "New Canvas Layer");
    canvasBtn.onClick = onNewCanvasLayer;

    var canvasNote = win.add("statictext", undefined,
      'Or skip this and draw a path directly on any existing shape layer.',
      { multiline: true });
    canvasNote.preferredSize.width = 230;

    var styleGroup = win.add("panel", undefined, "Stroke style");
    styleGroup.orientation = "column";
    styleGroup.alignChildren = ["fill", "top"];
    styleGroup.margins = 12;
    styleGroup.spacing = 8;

    var colorRow = styleGroup.add("group");
    colorRow.add("statictext", undefined, "Color:");
    var swatch = colorRow.add("panel", undefined, "");
    swatch.preferredSize = [28, 18];
    function paintSwatch() {
      swatch.graphics.backgroundColor = swatch.graphics.newBrush(
        swatch.graphics.BrushType.SOLID_COLOR,
        [currentColor[0], currentColor[1], currentColor[2], 1]
      );
    }
    paintSwatch();

    var pickBtn = colorRow.add("button", undefined, "Choose…");
    pickBtn.onClick = function () {
      var picked = $.colorPicker(); // returns 0xRRGGBB, or -1 if canceled
      if (picked === -1 || picked === undefined) return;
      currentColor = [
        ((picked >> 16) & 0xFF) / 255,
        ((picked >> 8) & 0xFF) / 255,
        (picked & 0xFF) / 255
      ];
      paintSwatch();
    };

    var presetRow = styleGroup.add("group");
    var blackBtn = presetRow.add("button", undefined, "Black");
    blackBtn.onClick = function () { currentColor = [0, 0, 0]; paintSwatch(); };
    var whiteBtn = presetRow.add("button", undefined, "White");
    whiteBtn.onClick = function () { currentColor = [1, 1, 1]; paintSwatch(); };
    var redBtn = presetRow.add("button", undefined, "Red");
    redBtn.onClick = function () { currentColor = [0.85, 0.1, 0.1]; paintSwatch(); };

    var widthRow = styleGroup.add("group");
    widthRow.add("statictext", undefined, "Width (px):");
    var widthInput = widthRow.add("edittext", undefined, String(DEFAULT_WIDTH));
    widthInput.characters = 5;

    var styleBtn = win.add("button", undefined, "Style as Brush Stroke");
    styleBtn.onClick = function () {
      var widthPx = parseFloat(widthInput.text);
      if (isNaN(widthPx) || widthPx <= 0) {
        alert("Enter a stroke width greater than 0.");
        return;
      }
      onStyleAsBrush(currentColor, widthPx);
    };

    var note = win.add("statictext", undefined,
      "Draw with the Pen tool (G) directly in the comp viewer, select the " +
      "layer, then click here. Fill is removed and a round-cap stroke in " +
      "the color/width above is applied. Re-run any time to restyle.",
      { multiline: true });
    note.preferredSize.width = 230;

    win.layout.layout(true);
    return win;
  }

  var panel = buildUI(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }

})(this);
