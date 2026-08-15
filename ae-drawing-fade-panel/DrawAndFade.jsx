/*
  DrawAndFade.jsx

  An After Effects ScriptUI panel that:
   1. Creates a blank, transparent layer set up for the built-in vector,
      pressure-sensitive Paint (Brush) tool.
   2. Creates a comp-size fill layer with a "Fade Amount" Slider Control
      effect wired to its opacity, so raising the slider in the Effect
      Controls panel fades out the layers underneath it.
   3. Opens the Draw Layer's Layer panel next to the Composition panel
      (AE's built-in Paint workspace), since AE's Paint tools only ever
      apply strokes in the Layer panel — this keeps the composited layers
      below visible as reference while you paint.

  Install: copy this file into
    Adobe After Effects <version>/Scripts/ScriptUI Panels/
  then open it from After Effects via Window > DrawAndFade.jsx.
  (It also runs as a floating window via File > Scripts > Run Script File.)

  See README.md in this folder for full usage notes and limitations.
*/

(function drawAndFade(thisObj) {

  var FADE_EFFECT_MATCH_NAME = "ADBE Slider Control";
  var FADE_EFFECT_NAME = "Fade Amount";
  var DRAW_LAYER_NAME = "Draw Layer";
  var FADE_LAYER_NAME = "Fade Fill";

  function getActiveComp() {
    var item = app.project.activeItem;
    if (!(item instanceof CompItem)) {
      alert("Select or open a composition first.");
      return null;
    }
    return item;
  }

  function createDrawLayer(comp) {
    // An empty shape layer is transparent by default, so it's a clean
    // canvas for the Paint tool without needing to zero out a solid's fill.
    var layer = comp.layers.addShape();
    layer.name = DRAW_LAYER_NAME;
    return layer;
  }

  function resolveDrawLayer(comp) {
    if (comp.selectedLayers.length === 1) return comp.selectedLayers[0];
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === DRAW_LAYER_NAME) return comp.layer(i);
    }
    return null;
  }

  // After Effects' Paint tools only ever apply strokes in the Layer panel,
  // which can't show other layers composited behind the one you're
  // painting. The closest native workaround is AE's built-in "Paint"
  // workspace, which docks a Layer panel next to the Composition panel so
  // you can see the full composite (refreshed after each stroke) while you
  // paint. This opens that layout for the given layer.
  function openLayerForPainting(layer) {
    layer.selected = true;
    try {
      layer.openInViewer();
    } catch (e) {}
    try {
      var cmdId = app.findMenuCommandId("Paint");
      app.executeCommand(cmdId);
    } catch (e2) {
      alert('Could not switch to the Paint workspace automatically. Choose "Window > Workspace > Paint" to see the Layer panel and Composition panel side by side.');
    }
  }

  function createFadeLayer(comp, color) {
    var layer = comp.layers.addSolid(color, FADE_LAYER_NAME, comp.width, comp.height, comp.pixelAspect, comp.duration);
    layer.name = FADE_LAYER_NAME;

    var fx = layer.property("ADBE Effect Parade").addProperty(FADE_EFFECT_MATCH_NAME);
    fx.name = FADE_EFFECT_NAME;
    // Slider Control defaults to a 0-100 range, matching layer opacity 1:1.
    layer.opacity.expression = 'effect("' + FADE_EFFECT_NAME + '")("Slider")';

    return layer;
  }

  function withUndoGroup(name, fn) {
    app.beginUndoGroup(name);
    try {
      fn();
    } finally {
      app.endUndoGroup();
    }
  }

  function onCreateDrawLayer() {
    var comp = getActiveComp();
    if (!comp) return;
    var drawLayer;
    withUndoGroup("Create Draw Layer", function () {
      drawLayer = createDrawLayer(comp);
    });
    openLayerForPainting(drawLayer);
    alert('Draw Layer added. Layer panel opened next to the Composition panel (Paint workspace). Press "Ctrl+B" / "Cmd+B" for the Brush tool and paint in the Layer panel — the Composition panel beside it updates with the full composite after each stroke.');
  }

  function onCreateFadeLayer(colorRgb) {
    var comp = getActiveComp();
    if (!comp) return;
    withUndoGroup("Create Fade Layer", function () {
      createFadeLayer(comp, colorRgb);
    });
  }

  function onCreateBoth(colorRgb) {
    var comp = getActiveComp();
    if (!comp) return;
    var drawLayer;
    withUndoGroup("Create Draw + Fade Layers", function () {
      // Fade layer is created first so the Draw layer (created second)
      // ends up above it in the stack, on top of the fade fill.
      createFadeLayer(comp, colorRgb);
      drawLayer = createDrawLayer(comp);
    });
    openLayerForPainting(drawLayer);
    alert('Draw Layer and Fade Fill added. Layer panel opened next to the Composition panel (Paint workspace). Press "Ctrl+B" / "Cmd+B" for the Brush tool and paint in the Layer panel — the Composition panel beside it updates with the full composite after each stroke.');
  }

  function onOpenForPainting() {
    var comp = getActiveComp();
    if (!comp) return;
    var drawLayer = resolveDrawLayer(comp);
    if (!drawLayer) {
      alert('Select the layer you want to paint, or create a Draw Layer first.');
      return;
    }
    openLayerForPainting(drawLayer);
  }

  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Draw & Fade", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 16;

    var fadeColorGroup = win.add("group");
    fadeColorGroup.add("statictext", undefined, "Fade fill color:");
    var colorDropdown = fadeColorGroup.add("dropdownlist", undefined, ["Black", "White"]);
    colorDropdown.selection = 0;

    function selectedColor() {
      return colorDropdown.selection.index === 0 ? [0, 0, 0] : [1, 1, 1];
    }

    var drawBtn = win.add("button", undefined, "Create Draw Layer");
    drawBtn.onClick = onCreateDrawLayer;

    var fadeBtn = win.add("button", undefined, "Create Fade Layer");
    fadeBtn.onClick = function () { onCreateFadeLayer(selectedColor()); };

    var bothBtn = win.add("button", undefined, "Create Both (stacked)");
    bothBtn.onClick = function () { onCreateBoth(selectedColor()); };

    var openBtn = win.add("button", undefined, "Open for Painting");
    openBtn.onClick = onOpenForPainting;

    var note = win.add("statictext", undefined,
      "Fade slider appears in Effect Controls on the Fade Fill layer. " +
      "Painting always happens in the Layer panel (an AE limitation) — " +
      "the buttons above dock it next to the Composition panel for reference.",
      { multiline: true });
    note.preferredSize.width = 220;

    win.layout.layout(true);
    return win;
  }

  var panel = buildUI(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }

})(this);
