import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SPORTPALEIS_ASSOCIATIONS, SPORTPALEIS_CONFIGURATION_VERSION, SPORTPALEIS_JUNIOR_GARMENT_SIZES, SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM } from "../config/sportpaleis-bedrukking-configuration.mjs";

const outputDirectory = fileURLToPath(new URL("../../outputs/sportpaleis-prepilot-completion-20260811/", import.meta.url));
const labels = { initialsShirt: "initialen shirt", backNumberJuniorSourceValue: "rugnummer Junior (bronwaarde)", backNumberSenior: "rugnummer Senior", chestNumber: "borstnummer", shortsNumber: "shortnummer", nameHeight: "naamhoogte" };

const rows = SPORTPALEIS_ASSOCIATIONS.map((association) => {
  const allowedOptions = Object.entries(association.dimensionsCm).filter(([, value]) => value !== null).map(([key]) => labels[key]);
  const dimensions = Object.fromEntries(Object.entries(association.dimensionsCm).filter(([, value]) => value !== null));
  const pioneers = association.name === "Almerer Pioneers";
  const statedInternal = /doen we zelf/i.test(association.notes);
  const dataGaps = [];
  if (!association.foilColors.length) dataGaps.push("Foliekleur ontbreekt in bevestigde matrix");
  if (!allowedOptions.length) dataGaps.push("Geen fysieke maatopties in bevestigde matrix");
  if (association.articleCatalogStatus === "NO_VALIDATED_ARTICLES") dataGaps.push("Geen brongevalideerde artikelcatalogus");
  else if (association.articleCatalogStatus !== "PILOT_CATALOG_PRESERVED_SOURCE_VALIDATION_PARTIAL") dataGaps.push("Artikelcatalogus slechts gedeeltelijk brongevalideerd");
  if (!pioneers) dataGaps.push("Exact lokaal vectorbronbestand/snijlijnen ontbreken", "Geen fysieke cut-output voor dit profiel gevalideerd");
  else dataGaps.push("Alleen cijfers 2, 34 en 77 op 200 mm fysiek/cut-ready bewezen", "Overige cijfers, namen, initialen en shortnummers niet cut-ready bewezen");
  return {
    association: association.name,
    articleGroupProfile: allowedOptions.length ? `${association.name} · ${allowedOptions.join(" / ")}` : "DATA_GAP",
    fontProfile: association.fontProfile || "DATA_GAP",
    foilColors: association.foilColors,
    allowedOptions,
    dimensionsCm: dimensions,
    juniorRule: allowedOptions.some((option) => option.includes("Junior")) ? { garmentSizes: SPORTPALEIS_JUNIOR_GARMENT_SIZES, physicalHeightMm: SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM, status: "HUMAN_CONFIRMED_RULE" } : null,
    fixedProductionElements: [],
    fixedProductionElementsStatus: "DATA_GAP · geen herbruikbaar logo/element met lokale bron en voorraad vastgelegd",
    producibility: pioneers ? "PARTIAL_INTERNAL_CUT_READY" : statedInternal ? "INTERNAL_STATED_NOT_CUT_READY" : "UNCONFIRMED",
    status: pioneers ? "PARTIAL_PHYSICAL_SCOPE" : "PROFILE_SOURCE_CONFIGURED_NOT_CUT_READY",
    source: association.source,
    notes: association.notes,
    dataGaps,
  };
});

const matrix = { buildId: "SPW-PRE-PILOT-MASTER-CORRECTION-20260811", configurationVersion: SPORTPALEIS_CONFIGURATION_VERSION, generatedAt: "2026-08-11T12:00:00.000Z", interpretationBoundary: "Bronconfiguratie is geen bewijs van lokaal aanwezige contoursource, WinPlot-import of fysieke cut-output.", associations: rows };
await mkdir(outputDirectory, { recursive: true });
await writeFile(`${outputDirectory}/PRODUCTION-GAP-MATRIX.json`, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
const table = rows.map((row) => `| ${row.association.replaceAll("|", "\\|")} | ${row.fontProfile.replaceAll("|", "\\|")} | ${row.allowedOptions.join(", ") || "DATA_GAP"} | ${row.foilColors.join(", ") || "DATA_GAP"} | ${row.producibility} | ${row.dataGaps.join("; ").replaceAll("|", "\\|")} |`).join("\n");
await writeFile(`${outputDirectory}/PRODUCTION-GAP-MATRIX.md`, `# Productie-gapmatrix\n\nBuild: ${matrix.buildId}\n\nBronconfiguratie is geen bewijs van lokaal aanwezige snijcontouren of fysieke output. Alleen de expliciet bewezen Pioneers-scope is positief aangemerkt.\n\n| Vereniging | Letterprofiel | Toegestane opties | Folie | Maakbaarheid | DATA_GAPS |\n|---|---|---|---|---|---|\n${table}\n`, "utf8");
console.log(JSON.stringify({ outputDirectory, associations: rows.length, partialPhysicalScopes: rows.filter(({ status }) => status === "PARTIAL_PHYSICAL_SCOPE").length, fullyCutReadyProfiles: 0 }, null, 2));
