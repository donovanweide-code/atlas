# Screenshotmanifest — Sportpaleis Workspace 005

Alle captures zijn op 7 augustus 2026 rechtstreeks gemaakt van de daadwerkelijk gerenderde lokale developmentroute. Het zijn browsercaptures, geen mock-ups of concept-renders.

Environment: `development`  
Origin: `http://127.0.0.1:5179`  
Build/release-ID in UI: `SPW-005-20260807`  
Browserfouten tijdens gecontroleerde routes: `0`

## Desktop — 1280 × 720

1. Workspace-overzicht — `/workspace/sportpaleis/overzicht`
2. Bedrukkingsmodule/orders — `/workspace/sportpaleis/orders`
3. Orderdetail — `/workspace/sportpaleis/orders/SNIJTEST-001`
4. Productiepreview/foliebatch — `/workspace/sportpaleis/productie`
5. Admin/beheer — `/workspace/sportpaleis/beheer`

## Mobiel — 390 × 844

6. Workspace-overzicht — `/workspace/sportpaleis/overzicht`
7. Orderdetail — `/workspace/sportpaleis/orders/SNIJTEST-001`
8. Bedrukkingsmodule/productiepreview — `/workspace/sportpaleis/productie`

## Visuele controlepunten

- geen horizontale pagina-overflow op de mobiele orderdetail- en productieroute;
- mobiele hoofdnavigatie zichtbaar en desktopzijbalk buiten beeld;
- verplichte aandacht-, productie- en veiligheidsinformatie zichtbaar;
- vijf daadwerkelijke vectorcontouren in de productiepreview;
- printactie zichtbaar maar uitgeschakeld;
- gebruikte breedte 416,4 mm, werkbreedte 440 mm en schaal 1:1 zichtbaar;
- drie klantgebruikers en extra-gebruikersprijzen alleen in beheer zichtbaar;
- geen console warnings of errors op de gecontroleerde eindroutes.

## Gebouwde previewbundel

Environment: lokale stateless workspace-previewruntime  
Origin tijdens validatie: `http://127.0.0.1:5182`  
Release-ID: `SPW-005-20260807`

- `/workspace/sportpaleis/overzicht` → HTTP 200;
- `/workspace/sportpaleis/orders/SNIJTEST-001` → HTTP 200;
- `/health` → `ok`;
- `X-Robots-Tag` bevat `noindex`.

De in-app-browser stond geen tweede lokale origin/poort toe (`ERR_BLOCKED_BY_CLIENT`). Daarom is de visuele screenshotset afkomstig van de developmentroute en is de gebouwde bundel afzonderlijk met buildverificatie, runtime-routetests en HTTP-probes gevalideerd. Dit onderscheid is bewust en voorkomt dat development als preview of productie wordt voorgesteld.
