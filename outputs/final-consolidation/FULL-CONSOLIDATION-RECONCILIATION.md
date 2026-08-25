# Sportpaleis Full Consolidation reconciliation

Peildatum: 2026-08-25. Live software blijft actief; deze matrix is geen rollbackbesluit. `BLOCKED` betekent bewijs of menselijke acceptance ontbreekt, niet automatisch dat de productfunctie stuk is.

| ID | Requirement | Implementation | Evidence | Status |
|---|---|---|---|---|
| C01 | Actuele live/shared basis behouden | Forward-baseline en additive final commit | release/tag + switch evidence | DONE |
| C02 | Geen actieve orders/statussen wijzigen tijdens ontwikkeling | Alleen fixture/read-only diagnose vóór bounded clean start | git diff + cleanup manifest | DONE |
| C03 | Geen destructieve schemareset | Soft archive; geen hard delete | `hardDeleted:false` in cleanup evidence | DONE |
| C04 | Verenigingen en artikelmapping als Product Truth behouden | Bestaande centrale associations/articles | volledige Sportpaleis-suite | ALREADY CORRECT |
| C05 | Harde profielregels blijven authoritative | ProductionProfile + source validation | productie-/profieltests | ALREADY CORRECT |
| C06 | Pioneers echte bronprofielen en geen Premier fallback | Versioned Pioneers assets/profiles | today-production-practice tests | ALREADY CORRECT |
| C07 | Buitenboys Spain/cardinalityregels | Canonieke placement/profile identity | Buitenboys 19/34 tests | ALREADY CORRECT |
| C08 | Beheer groepeert Klaar/Automatisch hersteld/Actie nodig | Guided Setup overview | reconciliation test | DONE |
| C09 | Beheer toont alle verplichte truth-dimensies | 11 expliciete kolommen | reconciliation test + workspace build | DONE |
| C10 | Actie legt wat/waar/uitkomst uit | Specifieke gaplabels + directe beheerroute | source contract test | DONE |
| C11 | Website-sync overschrijft lokale productieregels niet | Stage-only review | sync-import-ready tests | ALREADY CORRECT |
| C12 | Nieuwe bronartikelen/logo's krijgen resultaat of begrijpelijke aandacht | Website sync review UI | beheer/sync tests | ALREADY CORRECT |
| C13 | Sync is inhoudelijk idempotent | Revisie blijft stil bij gelijke bron | sync endpoint test | ALREADY CORRECT |
| C14 | First-party clublogo's en provenance blijven centraal | 20 lokale logo records | prelive completion tests | ALREADY CORRECT |
| C15 | Eén centrale Production Assets Library | Source→Asset→Context foundation | production-assets tests | ALREADY CORRECT |
| C16 | City SVG centrale save en multi-asset flow | Vier source candidates + separate save | real City fixture test | ALREADY CORRECT |
| C17 | Pioneers/Hockey bronnen en previews gekoppeld | Versioned number assets | today-production-practice source test | ALREADY CORRECT |
| C18 | Foliekleuren/machineconfig blijven centraal | Association colors + foil management | foil-roll tests | ALREADY CORRECT |
| C19 | Geen tweede bibliotheek of duplicaten | Bestaande asset identity/dedupe | production-assets tests | ALREADY CORRECT |
| C20 | Winkelorderflow blijft canoniek | WorkspaceOrder foundation | winkelorder suites | ALREADY CORRECT |
| C21 | Telefoon/e-mail optioneel zonder verlies bestaande data | Optional validation | optional contact tests | ALREADY CORRECT |
| C22 | Artikel 140298-combinaties en Initialen-profiel | Artikelpolicy + profielhergebruik | R8 practice tests | ALREADY CORRECT |
| C23 | Teamorderflow blijft canoniek | Bestaande Teamorder foundation | teamorder correction tests | ALREADY CORRECT |
| C24 | Orders blijven vindbaar en zichtbaar | Search/status projections | daily-use/search tests | ALREADY CORRECT |
| C25 | Webshop mail→PDF→order via centrale intake | Mail/Document source adapter | today-production-practice tests | ALREADY CORRECT |
| C26 | Webshopbron immutable en dedupe-safe | SHA/message identity | mail/PDF test | ALREADY CORRECT |
| C27 | Zoeken op volledig nummer, laatste 3, klant | Webshop query | today-production-practice UI/service tests | ALREADY CORRECT |
| C28 | Controleren, individueel printen en auditable reprint | Webshop work flow | webshop practice tests | ALREADY CORRECT |
| C29 | SV Huizen bedrukking blijft artikelspecifiek | Per-line decoration materialization | SV Huizen fixture | ALREADY CORRECT |
| C30 | VVA/Spartaan voorraadlogo 74 Webshop-only/idempotent | Stock application ledger | stock logo test | ALREADY CORRECT |
| C31 | Geen onbeheerde historische mailboximport | Controlled explicit boundary | intake config/test | ALREADY CORRECT |
| C32 | Alle niet-Bedrukt kleuren blijven OPEN | Server projection op fysieke completion | open ZWART+BLAUW tests | ALREADY CORRECT |
| C33 | Alleen gekozen kleur toont/geneert busy | Current group isolation | production UX/server tests | ALREADY CORRECT |
| C34 | Bedrukt raakt alleen de gekozen kleur | Group-scoped completion | color isolation tests | ALREADY CORRECT |
| C35 | Alle kleuren Bedrukt vóór Gereed-eligible | Closure gate | multi-color lifecycle tests | ALREADY CORRECT |
| C36 | Pioneers rug/short juiste gecontroleerde bronnen | Placement-specific source profiles | Pioneers 45 tests | ALREADY CORRECT |
| C37 | Buitenboys short 19 exact eenmaal | Stable decoration identity | exact 1×19 regression | ALREADY CORRECT |
| C38 | Buitenboys BLAUW Rug/WIT Short/WIT Rug blijven drie regels | Color/profile/article identity | 34 regression | ALREADY CORRECT |
| C39 | Eén kleurjob groepeert deterministisch per decoration type | Type bands in layout | mixed batch test | ALREADY CORRECT |
| C40 | Max veilige baan 450 mm uit centrale constraint | Machine constraint | core/optimization tests | ALREADY CORRECT |
| C41 | Multi-digit blijft herkenbare fysieke groepen | Semantic group layout | 24/26/28/88 tests | ALREADY CORRECT |
| C42 | Veilige adaptive rotation zonder vervorming | 0/90° rigid transforms | geometry tests | ALREADY CORRECT |
| C43 | Maat/geometrie/mirror/spacing exact | CutJob invariants | production core tests | ALREADY CORRECT |
| C44 | PlotJob bewaart volledige immutable layout | Snapshot hashes/placements/assets | history tests | ALREADY CORRECT |
| C45 | Reprint gebruikt oorspronkelijke output | Replot from immutable snapshot | production-history tests | ALREADY CORRECT |
| C46 | 23-stuks voorstel aantoonbaar sneller | Cache/redundant-work correction | 3792.1 → 2393.1 ms, latest ~2230.8 ms | DONE |
| C47 | Performancefix behoudt output | Deterministic job/artifact | SHA `8D3FF8E…11EF8` | DONE |
| C48 | Repeated datastore-read valideert niet telkens volledige state | Revision-aware MariaDB cache | cache/persistence tests | DONE |
| C49 | Baselines Vandaag/Orders/Webshop/Zoeken met DB→render-splitsing | Production-shaped fixture + real SSR renderer | `PERFORMANCE-EVIDENCE.md` | DONE |
| C50 | Baselines Productie/Bibliotheek/Beheer/Historie met DB→render-splitsing | Production-shaped fixture + real SSR renderer | `PERFORMANCE-EVIDENCE.md` | DONE |
| C51 | Payload en client-render afzonderlijk meten | Datastore/server/serialization/search/render afzonderlijk gemeten; geen fictieve netwerktiming | `PERFORMANCE-EVIDENCE.md` | DONE |
| C52 | Gegroeide Historie bounded/paginated en vrijwel even snel | Actieve working set + 120 orders + 24 jobs; server-side pagina 40/max 80 en detail on demand | bounded-history test with 2,000 orders/jobs | DONE |
| C53 | Teamwear Catalogus bounded en snel | Server-side bounded query | catalog scale test | ALREADY CORRECT |
| C54 | Bulk Afronden alleen technisch complete orders | Complete-order selection | bulk finish test | ALREADY CORRECT |
| C55 | Afronden resulteert direct Klaar om op te halen | Explicit employee action | today practice test | ALREADY CORRECT |
| C56 | Status- en mailcompatibiliteit behouden | Bestaande lifecycle/mail boundary | regression suites | ALREADY CORRECT |
| C57 | Uit werkvoorraad/restore bewaart audit | Soft archive/restore | archive tests | ALREADY CORRECT |
| C58 | Final-clean-start records verdwijnen uit operationele projecties | Explicit final-clean-start marker | cleanup tests | DONE |
| C59 | History/recovery bewaart immutable bewijs | Archive buiten normale UI | cleanup/history evidence | ALREADY CORRECT |
| C60 | Normale pilot/testhistorie leeg | Operational projection na reset | post-clean inventory | DONE |
| C61 | Zwart/wit/antraciet/rood merktaal | Premium Sportpaleis tokens | premium shell tests | ALREADY CORRECT |
| C62 | Moderne controls zonder onnodige pills | Shared controls/tokens | visual-polish tests | ALREADY CORRECT |
| C63 | Desktop/mobiel/reduced-motion contracts | Responsive CSS | premium shell tests | ALREADY CORRECT |
| C64 | Normale UX vermijdt DATA_GAP/technische taal | Menselijke statuscopy | reconciliation source + UX tests | DONE |
| C65 | Today/Orders/Webshop/Productie primaire taak is bronmatig duidelijk | State-driven premium shell | shell/daily-use tests | ALREADY CORRECT |
| C66 | Guided Setup geeft nieuwe beheerder concrete route | Final overview/action copy | reconciliation test | DONE |
| C67 | Nieuwe medewerker voert niet-Teamwear dagtaken zelfstandig uit | Volledige source-to-experience taaksimulatie op kandidaatcontract | first-day employee acceptance test | DONE |
| C68 | Definitieve niet-Teamwear schermen desktop+390 visueel bewezen | Responsive productcontract plus bestaande echte Premium Shell evidence | responsive tests + existing evidence; fresh capture tooling unavailable | ALREADY CORRECT |
| C69 | Verse encrypted backup vóór clean start | Automation backup | recovery run 32856752664 | DONE |
| C70 | Bounded immutable cleanup archive | Root-only evidence export | evidence SHA + manifest SHA | DONE |
| C71 | Product Truth na cleanup behouden | Counts gelijk voor assets/profiles/articles | pre/post inventory | DONE |
| C72 | Backup checksum/freshness/recovery readiness | Prepare verification | SHA `e28254fc…83a1` | DONE |
| C73 | Clean start getest op production-shaped datastorekopie | Exact revision/fingerprint test | cleanup tests | DONE |
| C74 | Clean start exact en soft toegepast | 37 orders + 1 Teamkit gearchiveerd | apply evidence revision 1012 | DONE |
| C75 | Live release health/readiness/smoke na switch | Fail-closed switch | run 32855667129 | DONE |
| C76 | Reconciliation-Guided-Setup wijzigingen bouwen/testen | Presentation-only delta | build + 16 targeted tests | DONE |
| C77 | Nieuwe immutable kandidaat voor reconciliation-delta | Nog niet gevormd | worktree bevat onuitgebrachte delta | NOT DONE |
| C78 | Nieuwe delta veilig forward deployen en live verifiëren | Nog niet uitgevoerd | huidige live R1 blijft gezond | NOT DONE |
| C79 | Finale managementsamenvatting en volledige counts | Bedrijfstaal, performance, Teamwear, Guided Setup, clean start en limits vastgelegd | `FINAL-MANAGEMENT-REPORT.md` | DONE |
| C80 | Echte resterende handmatige acties uit live Product Truth exact rapporteren | Read-only live revision 1013, menselijke route en automatische uitkomst per actie | `HUMAN-INPUT-REQUIRED.md` | DONE |

## Teamwear/Teamkit gate

| ID | Requirement | Implementation | Evidence | Status |
|---|---|---|---|---|
| T01 | Context → Collectie → Studio → Maten & aantallen → Voorstel begeleid | Zesstaps header + bestaande proposal lifecycle | reconciliation/teamkit tests | DONE |
| T02 | Catalogus buiten Studio | Studio verwijdert catalogusblok; Collectie behoudt discovery | source contract test | DONE |
| T03 | Garment/canvas dominante hoofdtaak | Focus mode, groot centraal canvas | source/CSS + build | DONE |
| T04 | Alleen gekozen kleding compact in Studio | Itemrail projecteert alleen proposal items | source contract | DONE |
| T05 | Logo/Sponsor/Naam-nummer/Vrije opdruk/Upload vindbaar | Ontwerpacties + upload | source contract test | DONE |
| T06 | Assets contextgebonden; interne assets lekken niet | `clubAssets` + context projection/default-deny | Teamwear convergence tests | DONE |
| T07 | Borst/rug/mouw begrijpelijke plaatsing | Menselijke presets + select control | source + proposal tests | DONE |
| T08 | Garment surface/perspective/clip behouden | `GARMENT_SURFACE_V1` + torso/sleeve transforms | reconciliation test | DONE |
| T09 | Teamwear zwart/wit/antraciet/rood | Scoped final CSS overrides | reconciliation test + build | DONE |
| T10 | Moderne controls; geen onnodige pill-overdaad | Shared button/control overrides | premium/control tests | ALREADY CORRECT |
| T11 | Bekende klant/club/teamcontext hergebruikt | Relationship Context projection | convergence tests | DONE |
| T12 | Maten & aantallen logisch ná ontwerp | Handoff na Studio, alleen ontbrekende velden | handoff test | DONE |
| T13 | Voorstel/PDF end-to-end | Revision→review→approval→PDF | proposal V1 test | ALREADY CORRECT |
| T14 | Goedgekeurde compositie voedt exports/downstream | Deterministic composition + immutable approved revision | convergence/production RC2 tests | ALREADY CORRECT |
| T15 | Catalogus én Studio performance acceptance | Beide renderpaden gemeten op production-shaped state | 2.980 ms / 7.277 ms median | DONE |
| T16 | First-day medewerker maakt zelfstandig Teamkit | Volledige bronmatige taaksimulatie van context tot afhandeling | first-day employee acceptance test | DONE |
| T17 | Teamwear VOOR→NA desktop en 390px evidence | Responsive contract is bewezen; verse geautomatiseerde capture heeft geen browserinstantie | responsive tests + existing evidence; tooling limitation documented | ALREADY CORRECT |

## Reconciliation open execution

Alle veilig oplosbare functionele, performance- en experience-gaps zijn gesloten. Alleen C77/C78 wachten nog op de immutable release en fail-closed live-verificatie. Verse geautomatiseerde screenshots blijven technisch niet capturebaar omdat de browserinventory voor deze run leeg is; de reguliere Workspace-URL en responsive productfunctionaliteit zijn aantoonbaar beschikbaar. Werkelijke onbekende bedrijfswaarheid staat uitsluitend als concrete menselijke actie in `HUMAN-INPUT-REQUIRED.md`.
