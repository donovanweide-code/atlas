import {
  boundsForContours,
  flattenSourcePath,
  transformContours,
  translateContours,
  type SourcePathCommand,
} from "./geometry.ts";
import type { CutPieceInput, PointMm } from "./types.ts";

export const REFERENCE_2_34_77_SOURCE = {
  file: "outputs/Sportpaleis-Snijtest-001/Sportpaleis-Snijtest-001-2-34-77.ai",
  sha256: "4DBA141DC0CF8FA5260CF8360608A314794F839932D4A421EAC036CF86668A7B",
  contourSource: "Pioneers nummers.ai",
  status: "TECHNICAL_CUT_VALIDATION_GO_DIMENSIONS_NOT_GOLDEN",
} as const;

const PDF_HEIGHT_PT = 918.425;
const MM_PER_PT = 25.4 / 72;

type PdfPathCommand =
  | { type: "move"; values: readonly [number, number] }
  | { type: "line"; values: readonly [number, number] }
  | { type: "cubic"; values: readonly [number, number, number, number, number, number] }
  | { type: "close" };

const move = (x: number, y: number): PdfPathCommand => ({ type: "move", values: [x, y] });
const line = (x: number, y: number): PdfPathCommand => ({ type: "line", values: [x, y] });
const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): PdfPathCommand => ({ type: "cubic", values: [x1, y1, x2, y2, x, y] });
const close = (): PdfPathCommand => ({ type: "close" });

function pdfPoint(point: readonly [number, number], translateX: number, translateY: number): PointMm {
  return {
    x: (translateX + point[0]) * MM_PER_PT,
    y: (PDF_HEIGHT_PT - (translateY + point[1])) * MM_PER_PT,
  };
}

function pdfContour(
  id: string,
  translateX: number,
  translateY: number,
  commands: readonly PdfPathCommand[],
) {
  const converted: SourcePathCommand[] = commands.map((command) => {
    if (command.type === "close") return { type: "close" };
    if (command.type === "move" || command.type === "line") {
      return { type: command.type, point: pdfPoint(command.values, translateX, translateY) };
    }
    return {
      type: "cubic",
      control1: pdfPoint([command.values[0], command.values[1]], translateX, translateY),
      control2: pdfPoint([command.values[2], command.values[3]], translateX, translateY),
      point: pdfPoint([command.values[4], command.values[5]], translateX, translateY),
    };
  });
  return flattenSourcePath(id, converted, 0.01);
}

const contour2 = pdfContour("reference-number-2", 614.5518, 909.9209, [
  move(0, 0), line(0, -240.264), cubic(0, -241.232, -13.511, -254.74, -40.529, -280.795),
  line(-218.424, -280.795), line(-364.768, -135.422), line(-470.823, -135.422),
  line(-470.823, -184.689), line(-422.772, -184.689),
  cubic(-386.853, -219.635, -354.817, -251.67, -326.664, -280.795),
  line(-566.93, -280.795), line(-566.93, -39.314), line(-348.507, -39.314),
  line(-202.163, -184.689), line(-96.106, -184.689), line(-96.106, -135.422),
  line(-144.159, -135.422), cubic(-180.24, -100.475, -212.275, -68.439, -240.266, -39.314),
  line(-40.529, -39.314), close(),
]);

const contour4 = pdfContour("reference-number-4", 1199.623, 580.8643, [
  move(0, 0), line(0, -135.422), line(-235.898, -135.422), line(-235.898, -184.687),
  line(0, -184.687), line(0, -280.793), line(-566.929, -280.793), line(-566.929, -184.687),
  line(-331.034, -184.687), line(-331.034, -39.316), line(-40.529, -39.316), close(),
]);

const contour3 = pdfContour("reference-number-3", 1199.623, 909.9209, [
  move(0, 0), line(0, -240.264), cubic(0, -241.236, -13.512, -254.744, -40.529, -280.795),
  line(-243.664, -280.795), line(-283.951, -241.478),
  cubic(-283.951, -242.286, -297.056, -255.392, -323.268, -280.795),
  line(-526.402, -280.794), cubic(-527.371, -280.794, -540.883, -267.286, -566.93, -240.263),
  line(-566.93, -39.317), line(-326.664, -39.317),
  cubic(-361.612, -75.233, -393.647, -107.269, -422.772, -135.423),
  line(-470.823, -135.423), line(-470.823, -184.688), line(-331.034, -184.688),
  line(-331.034, -120.13), cubic(-331.034, -119.161, -315.017, -103.142, -282.979, -72.079),
  line(-235.898, -120.13), line(-235.898, -184.688), line(-96.107, -184.689),
  line(-96.107, -135.424), line(-144.16, -135.424),
  cubic(-180.24, -100.474, -212.275, -68.438, -240.266, -39.317),
  line(-40.529, -39.318), close(),
]);

const contour7Left = pdfContour("reference-number-7-left", 614.5518, 290.5898, [
  move(0, 0), line(0, -280.793), line(-93.922, -280.793),
  cubic(-95.705, -280.793, -253.371, -232.336, -566.93, -135.422),
  line(-566.93, -39.314), line(-96.105, -184.687), line(-96.105, -135.422),
  line(-144.158, -135.422), cubic(-180.238, -100.475, -212.273, -68.438, -240.268, -39.314),
  line(-40.531, -39.314), close(),
]);

const contour7Right = pdfContour("reference-number-7-right", 614.5518, 610.502, [
  move(0, 0), line(0, -280.793), line(-93.922, -280.793),
  cubic(-95.705, -280.793, -253.371, -232.336, -566.93, -135.422),
  line(-566.93, -39.314), line(-96.105, -184.687), line(-96.105, -135.422),
  line(-144.158, -135.422), cubic(-180.238, -100.474, -212.273, -68.438, -240.268, -39.314),
  line(-40.531, -39.314), close(),
]);

function sourceOrientation(contours: readonly ReturnType<typeof pdfContour>[]) {
  const bounds = boundsForContours(contours);
  const normalized = translateContours(contours, { x: -bounds.minX, y: -bounds.minY });
  // Het referentiebestand staat al 90 graden. Voor deze regressie wordt de
  // invoer teruggezet, zodat de productieregel de 90-gradenrotatie aantoonbaar uitvoert.
  return transformContours(normalized, false, 270);
}

const WHITE_FOIL = { code: "HTV-WHITE", foilColor: "Wit", description: "Referentiefolie Snijtest 001" } as const;

export function createReferencePieces(): CutPieceInput[] {
  return [
    {
      id: "back-number-2",
      label: "Rugnummer 2",
      sourceOrderId: "SNIJTEST-001-REFERENCE",
      product: "Senior rugnummer 20 cm - technische referentie",
      printType: "rugnummer",
      association: "Almere Pioneers (alleen maatvoering referentietest)",
      requestedPhysicalSizeMm: { heightMm: 200 },
      vectorProfile: "Pioneers nummers.ai - specifieke cijfercontour",
      material: WHITE_FOIL,
      contours: sourceOrientation([contour2]),
      productionRule: { mirror: true, rotation: 90 },
    },
    {
      id: "back-number-34",
      label: "Rugnummer 34",
      sourceOrderId: "SNIJTEST-001-REFERENCE",
      product: "Senior rugnummer 20 cm - technische referentie",
      printType: "rugnummer",
      association: "Almere Pioneers (alleen maatvoering referentietest)",
      requestedPhysicalSizeMm: { heightMm: 200 },
      vectorProfile: "Pioneers nummers.ai - specifieke cijfercontour",
      material: WHITE_FOIL,
      contours: sourceOrientation([contour3, contour4]),
      productionRule: { mirror: true, rotation: 90 },
    },
    {
      id: "back-number-77",
      label: "Rugnummer 77",
      sourceOrderId: "SNIJTEST-001-REFERENCE",
      product: "Senior rugnummer 20 cm - technische referentie",
      printType: "rugnummer",
      association: "Almere Pioneers (alleen maatvoering referentietest)",
      requestedPhysicalSizeMm: { heightMm: 200 },
      vectorProfile: "Pioneers nummers.ai - specifieke cijfercontour",
      material: WHITE_FOIL,
      contours: sourceOrientation([contour7Left, contour7Right]),
      productionRule: { mirror: true, rotation: 90 },
    },
  ];
}
