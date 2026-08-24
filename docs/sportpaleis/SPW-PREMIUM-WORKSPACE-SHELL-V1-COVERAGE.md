# Sportpaleis Premium Workspace Shell V1 — coverage en QA

## Grens en baseline

- Baseline: `SPW-QUICK-INTAKE-ADAPTIVE-NESTING-V1-R9-20260824` (`7877195c9645badec1521787c9389ca7488fc96e`).
- Branch/worktree: `codex/spw-premium-shell-v1-20260824` in de afzonderlijke worktree `premium-shell-r9`.
- Wijzigingssoort: presentation/interaction wiring, CSS-tokens en presentationtests.
- Niet gewijzigd: API, datastore/schema, order- of productiestates, nesting, baanbreedte, SVG-geometrie, PlotJob, History/Reprint, rollen, revisions en concurrency.
- Niet uitgevoerd: production switch, production mutation, cleanup of integratie van de parallelle Digitaal Voorstel-code.

## R9 capability coverage

| R9 capability | Oude locatie | Nieuwe locatie | Nadruk | Mobiele locatie | Functioneel onveranderd |
|---|---|---|---|---|---|
| Winkelorders | Orders / Bedrukken | Orders / Bedrukken | Primair | Orders + contextuele invoer | PASS |
| Webshoporders | Webshop naast importtechniek | Webshoporders | Primair dagelijks werk | Webshop via primair/contextmenu | PASS |
| Divide/import en synchronisatie | Webshop | Beheer → Webshop | Secundair beheer | Beheer → Webshop | PASS |
| Teamorders | Nieuwe order / Teamorder | Ongewijzigd onder Nieuwe order | Secundair | Volledig menu | PASS |
| Artikel 140298 | Bedrukken | Initialen direct; extra nummers uitklapbaar | Primair + secundair | Dezelfde volgorde | PASS |
| Optioneel telefoonnummer | Orderinvoer/detail | Ongewijzigd | Primair waar relevant | Ongewijzigd | PASS |
| Universele Search | Hoofdnavigatie | Rustige hoofdnavigatie | Primair | Onderste primaire navigatie | PASS |
| Productiequeue | Productie | Digitale werktafel met state-driven actie | Primair | Productie in primaire navigatie voor operator | PASS |
| Vrije veilige kleurkeuze | Productiecard | Dezelfde card, rustigere actieve/wachtende staat | Primair | Zelfde card, één kolom | PASS |
| Resterende OPEN kleur | Productiecard | `Nog te produceren` / wachtend | Secundair zichtbaar | Onder actieve stap | PASS |
| Selected/waiting busy-state | Productiecard | Alleen gekozen kleur lokaal busy | Primair/lokaal | Zelfde lokale feedback | PASS |
| Proposal generation | Productie | Eén dominante actie per state | Primair | Volle cardbreedte | PASS |
| Adaptive nesting / 450 mm | Productiedetails/PlotJob | Compacte samenvatting; details behouden | Secundair | Details | PASS |
| Multi-digit grouping | Proposal/PlotJob | Ongewijzigde R9-output | Secundair | Details/PlotJob | PASS |
| PlotJob openen/Bedrukt | Productiehistorie/job | Productiebestand openen → Bedrukt | Primair per state | Dezelfde state-actie | PASS |
| Gereed-eligible / Gereed | Productie | State-driven Gereed-actie | Primair wanneer eligible | Dezelfde state-actie | PASS |
| Uit werkvoorraad / herstel | Orderdetail/Productiearchief | Details / rustige secundaire actie | Secundair/destructief | Details | PASS |
| History | Productiehistorie | Productie → Plot-/printhistorie | Secundair | Productie/details | PASS |
| Exact Reprint | Productiejob | Ongewijzigde immutable jobcontext | Secundair | Productiejob | PASS |
| Bibliotheek | Productie-assets | Bibliotheek met visuele assets | Primair modulewerk | Eénkoloms cards | PASS |
| Central SVG save | Bron toevoegen | Vier begrijpelijke stappen | Primair in bronflow | Gestapelde flow | PASS |
| Multi-asset selectie | Brononderdelen | Visuele cards na centrale save | Primair in bronflow | Gestapelde cards | PASS |
| Club/profile association | Assetdetail | Assetdetail | Secundair | Assetdetail | PASS |
| Nummerset/hockey | Bibliotheek/order | Ongewijzigd | Secundair | Assetdetail/order | PASS |
| Quick Intake PDF/document | Productie/intake | `Order uit document` als uitklapbare secundaire ingang | Secundair | Productie/details | PASS |
| Photo/camera ingang | Dagelijkse intake | Geparkeerd; geen zichtbare CTA | Bewust later | Niet zichtbaar | PASS |
| Generic source/evidence | Intakefoundation | Ongewijzigd achter documentflow | Technisch/details | Ongewijzigd | PASS |
| Beheer | Platte verzameling kaarten/velden | Gegroepeerd op organisatie, productie, webshop, verenigingen, communicatie en toegang | Secundair | Eén kolom | PASS |
| Rollen/multi-user | Beheer/account | Ongewijzigd, gegroepeerd onder Mensen & toegang | Secundair | Volledig menu/account | PASS |
| Service worker | PWA | Ongewijzigd | Technisch | Ongewijzigd | PASS |

## Source-to-experience gate

| Requirement | Status | Evidence |
|---|---|---|
| Consistente premium shell/navigation | ZICHTBAAR | `data-premium-shell="v1"`, gedeelde tokens, compacte desktop- en mobiele navigatie; source-test PASS |
| Today als dagelijkse ingang | ZICHTBAAR | `VOLGENDE BESTE ACTIE`, maximaal vier aandachtitems, recente wijzigingen ingeklapt; source-test PASS |
| Orders scanbaar en capability-safe | ZICHTBAAR | rustige filters, row navigation, bulkselectie pas na expliciet openen; volledige functionele tests PASS |
| Webshop = dagelijks orderwerk | ZICHTBAAR | dagelijkse route bevat webshoporders en relevante Attention; source-test PASS |
| Beheer → Webshop = import/sync | ZICHTBAAR | aparte beheerroute met bestaande importstatus, planning, handmatige import en technische details; source-test PASS |
| Productie state-driven | ZICHTBAAR | bestaande R9-state bepaalt CTA; kleur-, busy-, Bedrukt- en Gereed-regressies PASS |
| Bibliotheek premium en visual-first | ZICHTBAAR | visuele grid/card- en bronflow-presentation; City/assettests PASS |
| Search rustig en universeel | ZICHTBAAR | bestaande zoeksemantiek en route behouden; regressie PASS |
| Beheer progressive disclosure | ZICHTBAAR | gegroepeerde kaarten; instellingen/advanced achter details; source-test PASS |
| Photo UI parked | ZICHTBAAR | geen foto/camera-input of CTA in dagelijkse route; gerichte test PASS |
| PDF/document behouden | ZICHTBAAR | document-only accept-filter en dezelfde centrale intakeflow; regressie PASS |
| Mail integration-ready | BEWUST LATER | verborgen presentation slot, geen route of nepknop |
| Voorstellen integration-ready | BEWUST LATER | shell-contract noemt proposals; geen parallelle code of route geïntegreerd |
| Desktop 1440×900 visueel ervaren | BLOCKED | in-app browserruntime bood tijdens deze run geen browserinstantie |
| Mobile 390×844 visueel ervaren | BLOCKED | dezelfde browserblokkade; responsive contracttest PASS maar geen screenshotclaim |
| Small mobile 320×700 visueel ervaren | BLOCKED | dezelfde browserblokkade; 320px CSS-contract aanwezig maar geen screenshotclaim |
| Keyboard/focus/contrast/reduced motion visueel ervaren | BLOCKED | source-contracttest PASS; ervaringscheck wacht op browser |

## Button-density review

| Scherm | Direct zichtbare dagelijkse acties | Contextueel/secondary gemaakt |
|---|---|---|
| Today | maximaal één volgende beste actie | recente wijzigingen ingeklapt |
| Orders | nieuwe order + drie primaire statusfilters | Gereed/Verwijderd/Alles en bulk verwijderen onder `Meer`/details |
| Webshop | order openen; beheerlink alleen voor admin | import/status/config volledig naar Beheer → Webshop |
| Productie | één CTA per actuele productiecard; drie primaire filters | Gereed/Alles, zoeken, Historie, archief en technische context onder `Meer`/details |
| Bibliotheek | `Bron toevoegen`; assetcard openen | associations en overige acties in assetdetail |
| Beheer | één `Openen ›` per beheerkaart | formulieren en technische velden pas na openen/uitklappen |

De numerieke/visuele button-density-beoordeling blijft onderdeel van de open screenshot-gate; bovenstaande is source- en DOM-contractbewijs, geen Human Experience-claim.

## Complexity-classificatie

### Beheer

- DAILY RELEVANT: Bibliotheek, productieprofielen, folie & machine, verenigingen, artikelen.
- ADMIN: algemene gegevens, webshop, klantberichten, medewerkers, gebruikers en rollen.
- ADVANCED: technische productie-instellingen, synchronisatiedetails, persoonlijke weergave.
- TECHNICAL INTERNAL: identifiers, batch/cursor, raw synchronisatiedetails; uitsluitend onder details.

### Webshop

- ORDER WORK: dagelijkse Webshop-route.
- ATTENTION: inline bij het betrokken orderitem.
- IMPORT STATUS en IMPORT CONFIG: Beheer → Webshop.
- TECHNICAL DEBUG: `Geavanceerde importcontext`.

## Test- en buildbewijs

- Gerichte Premium Shell-tests: 5/5 PASS.
- Volledige Sportpaleis-suite: 380/381 PASS.
- Enige failure: bestaande host-timinggrens `Teamorder 1-20` — 15.027,2 ms tegen 15.000 ms; ongewijzigde R9-baseline mat eerder 15.259 ms. Geen betrokken productie- of nestingcode gewijzigd.
- Production-shaped checks in de suite: City SVG, central save, multi-asset, 450-mm nesting, 4×26, kleurconcurrency, Bedrukt/Gereed, History/Reprint en artikel 140298 PASS.
- Production build: PASS; 219 buildbestanden geverifieerd.
- Nieuwe dependencies: geen.
- Bundle-impact versus R9: JS +3.486 bytes raw / +1.116 bytes gzip; CSS +21.064 bytes raw / +4.124 bytes gzip.
- Dependency-audit: bestaande transitive bevindingen blijven 1 high (`nanoid`) en 1 moderate (`postcss`); geen lockfile- of dependencywijziging in deze shell.

## Screenshotmanifest

Verplicht maar nog niet geproduceerd wegens ontbrekende in-app browserinstantie:

- Desktop 1440×900: Today, Orders, orderdetail, Webshop, Productie, actieve productieorder, Bibliotheek, bronupload, Search, Beheer, Beheer → Webshop, productie-instellingen.
- Mobile 390×844: Today, Orders, Webshop, Productie, Bibliotheek, Beheer.
- Small mobile 320×700: Today, Orders, Webshop, Productie, Beheer.

Geen alternatief browseroppervlak is gebruikt om de verplichte visual-QA stil als PASS te presenteren.
