const { primitives, transforms, booleans, extrusions, text, hulls, colors } = jscadModeling;

const { cuboid, cylinder, circle } = primitives;
const { translate, center } = transforms;
const { union, subtract } = booleans;
const { extrudeFromSlices, extrudeLinear, slice } = extrusions;
const { vectorChar, vectorText } = text;
const { hullChain } = hulls;
const { colorize } = colors;

const holeSizes = [6, 6.35, 7, 8, 9, 9.52, 10, 12, 12.7];  // Sizes for each row (mm)
const holeSizeLabels = ["6mm", '1/4"', '7mm', '8mm', '9mm', '3/8"', '10mm', '12mm', '1/2"'];
const sizeDeltas = [-0.2, 0.0, 0.1, 0.2, 0.4, 0.6];  // Deltas from nominal size (mm)
const spacing = 18;  // Spacing between the holes (mm)
const plateThickness = 10;  // Thickness of the plate (mm)
const textHeight = 1.5;  // Height of the text extrusion (mm)
const textDepth = 0.8;  // Depth of the text (mm)
const cylinderHeight = 20;  // Peg height, mm
const margin = 12;
const textColor = [1, 0, 0];

function hole(size) {
  return cylinder({ height: plateThickness, radius: size / 2 });
}

function holeGrid() {
  const holes = [];
  for (let row = 0; row < holeSizes.length; row++) {
    for (let col = 0; col < sizeDeltas.length; col++) {
      holes.push(
        translate(
          [(col + 0.5) * spacing, (row + 0.5) * spacing, plateThickness/2.],
          hole(holeSizes[row] + sizeDeltas[col])
        )
      );
    }
  }
  return holes;
}

// Build text by creating the font strokes (2D), then extruding up (3D).
const buildFlatText = (message, extrusionHeight, characterLineWidth) => {
  if (message === undefined || message.length === 0) return []

  const lineRadius = characterLineWidth / 2
  const lineCorner = circle({ radius: lineRadius })

  const lineSegmentPointArrays = vectorText({ x: 0, y: 0, input: message, align: 'center', height: textHeight}) // line segments for each character
  const lineSegments = []
  lineSegmentPointArrays.forEach((segmentPoints) => { // process the line segment
    const corners = segmentPoints.map((point) => translate(point, lineCorner))
    lineSegments.push(hullChain(corners))
  })
  const message2D = union(lineSegments)
  const message3D = extrudeLinear({ height: extrusionHeight }, message2D)
  return colorize(textColor, center({axes: [true, true, false]}, message3D))
}

// Add text for nominal dimension per row
function rowTextLabels() {
  const texts = [];
  for (let row = 0; row < holeSizes.length; row++) {
    texts.push(
      translate(
        [-margin / 4, (row + 0.5) * spacing, plateThickness],
        buildFlatText(holeSizeLabels[row], textDepth, 0.4)
      )
    )
    ;
  }
  return texts;
}

// Add text for delta dimension per column
function columnTextLabels() {
  const texts = [];
  for (let col = 0; col < sizeDeltas.length; col++) {
    var label = sizeDeltas[col].toString();
    if (sizeDeltas[col] >= 0) {
      label = "+" + label;
    }
    texts.push(
      translate(
        [(col + 0.5) * spacing, 0., plateThickness],
        buildFlatText(label, textDepth, 0.4)
      )
    );
  }
  return texts;
}

// Create a base plate with the holes
function fitmentTestPlate() {
  const plateWidth = (sizeDeltas.length) * spacing;
  const plateHeight = (holeSizes.length) * spacing;
  const basePlate = cuboid({ size: [plateWidth + margin, plateHeight + margin, plateThickness], center: [ plateWidth / 2. - margin/2., plateHeight / 2. - margin/2., plateThickness / 2.]});

  const plateWithHoles = subtract(basePlate, holeGrid());
  return plateWithHoles;
}

// Function to create individual cylinders
function cylinderPart(diameter) {
  return cylinder({ height: cylinderHeight, radius: diameter / 2 });
}

// Function to create the full set of cylinders, each as a separate part
function createCylinders() {
  var cylinders = [];
  var labels = [];
  for (let i = 0; i < holeSizes.length; i++) {
    cylinders.push(
      translate([-spacing, (i + 0.5) * spacing, cylinderHeight/2.], cylinderPart(holeSizes[i]))
    );
    labels.push(
      translate(
        [-spacing, (i + 0.5) * spacing, cylinderHeight],
        buildFlatText(holeSizes[i].toFixed(1), textDepth, 0.4)
      )
    );
  }
  return [cylinders, labels];
}

function generateFitmentTest() {
  var plate = fitmentTestPlate();
  plate.name = "plate";
  const rowLabels = rowTextLabels();
  const columnLabels = columnTextLabels();
  var [cylinders, cylinderLabels] = createCylinders()
  var plate_labels = colorize(textColor, union([rowLabels, ...columnLabels]));
  plate_labels.name = "plate_labels";
  var cylinder_labels = colorize(textColor, union(cylinderLabels));
  cylinder_labels.name = "cylinder_labels";
  cylinders = union(cylinders);
  cylinders.name = "cylinders";
  return [
    plate, plate_labels, cylinders, cylinder_labels
  ];
}

export { generateFitmentTest };