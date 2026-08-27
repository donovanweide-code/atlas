import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
const teamwearWorkspace = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
const teamwearExperience = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
const teamwearCss = await readFile(new URL("../src/styles/sportpaleis-teamwear.css", import.meta.url), "utf8");
const proposalCss = await readFile(new URL("../src/styles/sportpaleis-proposal.css", import.meta.url), "utf8");

test("first-day medewerker vindt en begrijpt de primaire dagelijkse Sportpaleis-taken", () => {
  const evidence = [
    ["webshoporder vinden", /Volledig ordernummer, laatste 3 cijfers of klantnaam/u],
    ["order begrijpen", /Orderdetail/u],
    ["order printen en reprint herkennen", /Opnieuw printen|Order printen/u],
    ["productie openen", /BESCHIKBARE FOLIEKLEUR/u],
    ["meerdere open kleuren begrijpen", /NOG TE PRODUCEREN/u],
    ["wachtende kleur is niet busy", /Wacht op huidige fysieke stap/u],
    ["Junior en Senior begrijpen", /Junior · 200 mm bij maat 116–164/u],
    ["initialen, naam, rug-, borst- en shortnummer", /initials[\s\S]*name[\s\S]*backNumber[\s\S]*chestNumber[\s\S]*shortsNumber/u],
    ["Afronden", /Afronden/u],
    ["Klaar om op te halen", /Klaar om op te halen/u],
    ["Historie en reprint", /Opnieuw plotten|Opnieuw printen/u],
    ["Beheer toont concrete inrichting", /Vereniging[\s\S]*Plaatsingen[\s\S]*Fonts[\s\S]*Maten[\s\S]*Kleuren[\s\S]*Productiemethode[\s\S]*Actie/u],
  ];
  for (const [task, pattern] of evidence) assert.match(workspace, pattern, `${task} moet zonder interne kennis vindbaar zijn`);
  assert.match(workspace, /\["nieuw", "team", "eigen-artikel"\]\.includes\(detailId\)/u, "standalone Bedrukken en de andere order-entryroutes mogen nooit als een order-ID worden opgehaald");
});

test("first-day medewerker kan de volledige Teamwear-flow bronmatig volgen", () => {
  assert.match(teamwearWorkspace, /Bestaande klant, vereniging of team/u);
  assert.match(teamwearWorkspace, /Start met wat al bekend is/u);
  assert.match(teamwearWorkspace, /Contact, planning en overige gegevens/u);
  assert.match(teamwearWorkspace, /Naar collectie/u);
  assert.match(teamwearExperience, /Context[\s\S]*Collectie[\s\S]*Studio[\s\S]*Voorstel & akkoord[\s\S]*Maten & aantallen[\s\S]*Afhandeling/u);
  assert.match(teamwearExperience, /Ontwerp toevoegen/u);
  assert.match(teamwearExperience, /data-kind="CLUB_LOGO">Logo/u);
  assert.match(teamwearExperience, /data-kind="SPONSOR">Sponsor/u);
  assert.match(teamwearExperience, /data-kind="NAME"[\s\S]*data-kind="BACK_NUMBER"[\s\S]*data-kind="FREE_TEXT"/u);
  assert.match(teamwearExperience, /Positiezone[\s\S]*Linkerborst[\s\S]*Middenachter[\s\S]*Mouw links/u);
  assert.match(teamwearExperience, /GARMENT_PRINT_AREA_V1/u);
  assert.match(teamwearExperience, /Naar maten & aantallen/u);
  assert.match(teamwearExperience, /Professioneel Teamwear-voorstel/u);
  assert.match(teamwearExperience, /PDF openen/u);
  assert.match(teamwearExperience, /Via Mail voorbereiden/u);
  assert.match(teamwearCss, /Tenant-brand enforcement[\s\S]*--teamwear-accent:#d3172f[\s\S]*focus-visible[\s\S]*var\(--teamwear-accent\)/u, "de finale tenantlaag dwingt rood/zwart af voor actieve en focusstates");
  assert.match(proposalCss, /Sportpaleis customer surface[\s\S]*\.tk-public\{background:linear-gradient\(180deg,#090a0c[\s\S]*\.tk-button--primary\{background:#17191d[\s\S]*#d3172f/u, "ook de klantpreview gebruikt de Sportpaleis-merkkleuren");
});
