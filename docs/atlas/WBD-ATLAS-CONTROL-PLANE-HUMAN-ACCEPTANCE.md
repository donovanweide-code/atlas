# Human Acceptance — WBD Atlas Control Plane

Gebruik uitsluitend de geïsoleerde reviewrelease. Voer geen production deployment of echte externe mutatie uit.

## Desktop

1. Log in als WBD Owner.
2. Open Today en bepaal binnen één minuut: verandering, Attention, Atlas-onderzoek, NBA, voorbereiding, GO en wat kan wachten.
3. Open Attention en controleer classificatie, interpretatie, confidence, NBA, menselijke inspanning en GO-status.
4. Open `Waarom zegt Atlas dit?` en daarna `Techniek`; controleer source, freshness en provenance-schema.
5. Open Organizations → We Build And Design; controleer gekoppelde Attention, Evidence en capabilities, plus eerlijke onbekenden.
6. Zoek `welke capabilities zijn bewezen bij Sportpaleis?` en controleer centrale capability/evidence-resultaten.
7. Zoek `wat vraagt mijn GO?` en controleer Human GO/Owner Action-resultaten.
8. Open Today → `Veilig beoordelen`; controleer dat voorstellen onder Beheer & GO geen centrale waarheid wijzigen vóór accept/adjust/reject.
9. Ga terug naar Today zonder verloren sessie of context.

## iPhone (390 × 844 acceptance viewport)

1. Herhaal login, Today, Attention, NBA en Evidence.
2. Controleer dat bottom navigation vast en bruikbaar is en geen horizontale overflow ontstaat.
3. Open WBD Organization en gekoppelde centrale context.
4. Gebruik Search en open Beheer & GO.
5. Controleer dat dezelfde centrale evidence/revision zichtbaar is als op desktop.

## Waardechecks

- A: `wat moet ik nu doen?` is binnen één minuut te beantwoorden.
- B: Atlas heeft bronfetch, normalization, hashvergelijking, provenance en volgende refresh voorbereid zonder Donovan.
- C: de live conclusie opent naar `https://webuildanddesign.nl/`, observed/fetched status en normalizer-schema.
- D: WBD Organization is centraal en op desktop/iPhone gelijk.
- E: contracttests onderscheiden STORING, VRAAG/UITLEG, FRICTIE, IDEE/KANS, NIEUWE_SCOPE, COMMERCIAL_OPPORTUNITY, TECHNICAL_VERIFICATION en PRODUCT_LEARNING; runtime bewijst Technical Verification/Product Learning.
- F: capability `connectors-snapshot-diff` heeft live evidence; bestaande capabilities behouden repository-evidence.
- G: de eerste live connector is end-to-end bewezen.

## Gemeten lokale acceptance

- Desktop: PASS voor login, Today, Attention, NBA, evidence/provenance, Organization, Search en GO-review.
- iPhone 390 × 844: PASS voor dezelfde kernflow; `scrollWidth 375` bij `innerWidth 390`, vaste bottom navigation en geen horizontale overflow.
- Production-shaped projectie + Search over >2.000 evidence-items: 65–78 ms in de contracttest, grens <500 ms.
- Live connectorfetch: 106,3 ms in de definitieve proof, één attempt.
