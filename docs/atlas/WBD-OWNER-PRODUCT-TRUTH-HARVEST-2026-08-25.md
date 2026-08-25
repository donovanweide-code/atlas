# WBD Owner Product Truth en release-Harvest

## Werkelijk geimplementeerd

De centrale WBD Owner-state bevat vanaf deze release één `productTruth`-document naast, en gekoppeld aan, de bestaande Capability Registry. De Registry blijft de capabilitybron; Product Truth projecteert daar module, lifecycle, roadmap, pricingcontext, klantbewijs en release-evidence omheen. Er is geen tweede capabilityregister.

De immutable `RELEASE-MANIFEST.json` van de actieve release wordt bij production startup server-side gelezen. Release-identiteit, commit, tag, manifesthash, component fingerprints en validatiestatus worden deduplicerend in Product Truth opgenomen. De deterministic Atlas-laag maakt daarvan Evidence en een Harvest candidate en projecteert de betekenis naar Since last visit, Attention en Next Best Action. Inference vanaf de eerste manifestopname is bewust `LOW`; een volgende manifestvergelijking kan `MEDIUM` zijn. Een release promoveert nooit zelfstandig een capability naar `PROVEN` of `REUSABLE`.

De owner-only API `GET /api/wbd/v1/product-truth` leest dezelfde centrale MariaDB-state als desktop en mobiel. Zonder geldige Owner-session wordt niets vrijgegeven. De state en Atlas-mutaties gebruiken de bestaande revision-, audit-, CSRF-, origin- en tenantgrenzen.

## Centrale contracten

- Capability lifecycle: `CONCEPT`, `BUILT`, `FIRST_REAL_USE`, `PROVEN`, `REUSABLE`.
- Roadmap: `NOW`, `NEXT`, `LATER`, `PARKED`.
- Scope: `CUSTOMER_SPECIFIC`, `GENERIC`, `GENERIC_WITH_CONFIGURATION`, `UNRESOLVED`.
- Pricing: `UNKNOWN`, `NEEDS_OWNER_CONFIRMATION`, `HYPOTHESIS`, `DEFINITIVE`.
- `DEFINITIVE` pricing vereist aantoonbare menselijke goedkeuring. Hypotheses worden in de UI expliciet als niet-definitief getoond.
- Customer proof bewaart organisatie, capability- en modulereferenties, bewijsstatus, evidence, beperkingen, privacygrens en laatste verificatie.

## Gebootstrapte werkelijkheid

- Sportpaleis Production en Quick Intake zijn klant-specifiek bewijs. WIT/ZWART-, profiel-, plot- en fysieke procesregels worden niet generiek gemaakt.
- AquaFlask/BijCees bewijst begrensde WooCommerce-diagnose met klantconfiguratie; structurele Commerce Care is geen bewezen feit.
- WBD immutable releasevalidatie is herhaalbare interne productevidence.
- WBD Experience bewijst bestaande sessie-, event- en hervatcontext, niet automatisch commerciële conversie.
- De genoemde €75 Workspace-context blijft een founding/pilothypothese en is geen generieke marktprijs.
- De goedgekeurde €35 per maand betreft interne runtimekosten en is geen klantprijs.
- Teamkit/digitaal voorstel heeft in de beschikbare canonieke bronnen onvoldoende bewijs en blijft `NEEDS_OWNER_CONFIRMATION`.

## Autonomie en Human GO

Atlas mag release-evidence opnemen, provenance/freshness vastleggen, dedupliceren, Harvest candidates maken, scope voorstellen en Today/Attention/NBA bijwerken. De huidige implementatie is `DETERMINISTIC`; er is geen modeltheater.

Human GO blijft verplicht voor commercieel materiele maturitypromotie, definitieve prijzen, modulegrenzen, publieke claims en iedere externe of production-businessmutatie. Het systeem maakt hiervoor een `PREPARE_ONLY` action. Deze release voert zulke acties niet uit.

## Source coverage

De bootstrap vergelijkt immutable releases, Capability Registry, centrale Owner-state, pricing/commercial documenten, Experience-bronnen, Sportpaleis production/tests en AquaFlask/BijCees case-evidence. Autoriteit, recency en bewijsstatus blijven per bron zichtbaar. `latest file wins` wordt niet gebruikt.

## Recovery en failure behavior

Product Truth is een additieve state-uitbreiding zonder destructieve schema- of databasemigratie. Bestaande state wordt bij initialize gevalideerd en aangevuld; bestaande capabilityrecords worden niet overschreven. Een ontbrekend of niet-corresponderend production release-manifest blokkeert startup. Connectorfailures blijven via de bestaande last-known-safe, freshness, retry en gegroepeerde Attention-grens lopen.

Rollback gebruikt de bestaande immutable releaseprocedure en de pre-activation databasebackup/state hashes. De vorige release blijft als volledig artifact beschikbaar; voor terugschakelen is geen rebuild nodig.
