import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SPORTPALEIS_ASSOCIATIONS, SPORTPALEIS_CONFIGURATION_VERSION, SPORTPALEIS_JUNIOR_GARMENT_SIZES, SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM } from "../config/sportpaleis-bedrukking-configuration.mjs";

const outputDirectory = fileURLToPath(new URL("../../outputs/sportpaleis-prepilot-completion-20260811/", import.meta.url));
const labels = { initialsShirt: "initialen shirt", backNumberJuniorSourceValue: "rugnummer Junior (bronwaarde)", backNumberSenior: "rugnummer Senior", chestNumber: "borstnummer", shortsNumber: "shortnummer", nameHeight: "naamhoogte" };

const rows = SPORTPALEIS_ASSOCIATIONS.map((association) => {
  const allowedOptions = Object.entries(association.dimensionsCm).filter(([, value]) => value !== null).map(([key]) => labels[key]);
  const dimensions = Object.fromEntries(Object.entries(association.dimensionsCm).filter(([, value]) => value !== null));
  const dataGaps = [];
  if (!association.foilColors.length) dataGaps.push("Foliekleur ontbreekt in bevestigde matrix");
  if (!allowedOptions.length) dataGaps.push("Geen fysieke maatopties in bevestigde matrix");
  if (association.articleCatalogStatus === "NO_VALIDATED_ARTICLES") dataGaps.push("Geen brongevalideerde artikelcatalogus");
  else if (association.articleCatalogStatus !== "PILOT_CATALOG_PRESERVED_SOURCE_VALIDATION_PARTIAL") dataGaps.push("Artikelcatalogus slechts gedeeltelijk brongevalideerd");
  return {
    association: association.name,
    articleGroupProfile: allowedOptions.length ? `${association.name} · ${allowedOptions.join(" / ")}` : "DATA_GAP",
    fontProfile: association.fontProfile || "DATA_GAP",
    foilColors: association.foilColors,
    allowedOptions,
    dimensionsCm: dimensions,
    juniorRule: allowedOptions.some((option) => option.includes("Junior")) ? { garmentSizes: SPORTPALEIS_JUNIOR_GARMENT_SIZES, physicalHeightMm: SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM, status: "HUMAN_CONFIRMED_RULE" } : null,
    fixedProductionElements: [],
    fixedProductionElementsStatus: "Geen vast productie-element in deze historische configuratiematrix; beheer actuele bronnen in Bibliotheek.",
    producibility: "PROFILE_SOURCE_OVERVIEW_ONLY",
    status: dataGaps.length ? "HUMAN_INPUT_REQUIRED" : "SOURCE_CONFIGURED",
    source: association.source,
    notes: association.notes,
    dataGaps,
  };
});

const matrix = { buildId: "SPW-PRE-PILOT-MASTER-CORRECTION-20260811", configurationVersion: SPORTPALEIS_CONFIGURATION_VERSION, generatedAt: "2026-08-11T12:00:00.000Z", interpretationBoundary: "Historisch bronoverzicht. Alleen ontbrekende maat, gecontroleerde productiebron of foliekleur kan actuele profielinrichting blokkeren; downstream Illustrator/WinPlot/Summa-handelingen zijn geen universele profielvelden.", associations: rows };
await mkdir(outputDirectory, { recursive: true });
await writeFile(`${outputDirectory}/PRODUCTION-GAP-MATRIX.json`, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
const table = rows.map((row) => `| ${row.association.replaceAll("|", "\\|")} | ${row.fontProfile.replaceAll("|", "\\|")} | ${row.allowedOptions.join(", ") || "DATA_GAP"} | ${row.foilColors.join(", ") || "DATA_GAP"} | ${row.producibility} | ${row.dataGaps.join("; ").replaceAll("|", "\\|")} |`).join("\n");
await writeFile(`${outputDirectory}/PRODUCTION-GAP-MATRIX.md`, `# Historisch productiebronoverzicht\n\nBuild: ${matrix.buildId}\n\nDit overzicht definieert geen universele snijlijn- of fysieke-outputvelden. Actuele readiness volgt uitsluitend uit bewezen maat, gecontroleerde productiebron en foliekleur.\n\n| Vereniging | Letterprofiel | Toegestane opties | Folie | Status | Open bronfeiten |\n|---|---|---|---|---|---|\n${table}\n`, "utf8");
console.log(JSON.stringify({ outputDirectory, associations: rows.length, humanInputRequired: rows.filter(({ status }) => status === "HUMAN_INPUT_REQUIRED").length }, null, 2));
