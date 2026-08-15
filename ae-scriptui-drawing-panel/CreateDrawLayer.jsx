/*
  CreateDrawLayer.jsx

  A dockable After Effects ScriptUI panel with one job: click "Create" and
  get a comp-sized layer ready for the built-in, pressure-sensitive Paint
  (Brush) tool — a fast way to sketch notes, annotations, or animatic
  linework directly in the Composition viewer, with the rest of your comp
  visible as reference the whole time.

  The created layer is a Solid, not an empty shape layer. A Solid always
  has a real, comp-sized bounding box, so After Effects can hit-test your
  clicks directly in the Composition panel and paint there in place —
  an empty shape layer has no bounding box to hit-test against, which is
  what forces AE to fall back to the isolated single-layer Layer panel
  view (losing sight of everything below) instead of painting in context.

  Because a Solid starts fully opaque, check "Paint on Transparent" in the
  Tools panel options bar (appears once the Brush tool is active) before
  your first stroke — that's a one-time toggle per AE session, not a
  script setting, since After Effects only exposes it as a paint-tool
  option and it doesn't exist as a scriptable property until a stroke has
  been painted. With it checked, the solid's own fill is left out of the
  render entirely; only your strokes show, composited over whatever is
  beneath the layer.

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

  function createDrawLayer(comp, baseName, limitSpan, fillColor) {
    // A comp-sized Solid has a real bounding box, so clicks in the
    // Composition panel hit-test onto it directly instead of AE falling
    // back to the isolated Layer panel view. "Paint on Transparent"
    // (toggled once by hand, see header note) drops the solid's own fill
    // from the render so only the painted strokes remain visible.
    var name = uniqueLayerName(comp, baseName || BASE_NAME_DEFAULT);
    var layer = comp.layers.addSolid(fillColor, name,
      comp.width, comp.height, comp.pixelAspect, comp.duration);

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

  function onCreate(baseName, limitSpan, fillColor) {
    var comp = getActiveComp();
    if (!comp) return;

    var layer;
    app.beginUndoGroup("Create Draw Layer");
    try {
      layer = createDrawLayer(comp, baseName, limitSpan, fillColor);
    } finally {
      app.endUndoGroup();
    }

    // AE's scripting API has no public command to switch the active tool
    // or toggle "Paint on Transparent", so the panel can't do either for
    // you — a one-time nudge in the status line is the best we can do.
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

    var colorGroup = win.add("group");
    colorGroup.add("statictext", undefined, "Fill color:");
    var colorDropdown = colorGroup.add("dropdownlist", undefined, ["Black", "White"]);
    colorDropdown.selection = 0;
    colorDropdown.helpTip = "Only matters if you forget to check " +
      "\"Paint on Transparent\" — with it checked, the fill color never " +
      "shows up in the render.";

    function selectedColor() {
      return colorDropdown.selection.index === 0 ? [0, 0, 0] : [1, 1, 1];
    }

    var frameCheckbox = win.add("checkbox", undefined, "Limit to 48 frames");
    frameCheckbox.helpTip = "Trims the new layer to 48 frames starting at " +
      "the playhead — click Create again further down the timeline to " +
      "start a fresh 48-frame drawing layer, animatic-beat style.";
    frameCheckbox.value = false;

    var createBtn = win.add("button", undefined, "Create");
    createBtn.onClick = function () {
      var baseName = (nameInput.text || "").replace(/^\s+|\s+$/g, "");
      var layer = onCreate(baseName || BASE_NAME_DEFAULT, frameCheckbox.value, selectedColor());
      if (layer) {
        status.text = '"' + layer.name + '" added and selected. Press ' +
          "Ctrl+B / Cmd+B, then check \"Paint on Transparent\" in the " +
          "options bar (once per session) and draw directly in the " +
          "Composition viewer.";
      }
    };

    var status = win.add("statictext", undefined,
      "Open a comp and click Create to add a layer to draw on.",
      { multiline: true });
    status.preferredSize.width = 220;
    status.preferredSize.height = 60;

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
