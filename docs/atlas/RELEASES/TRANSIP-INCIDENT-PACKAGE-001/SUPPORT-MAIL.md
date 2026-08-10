# Supportmail voor TransIP

**Onderwerp:** DocumentRoot-wijziging zichtbaar in controlepaneel maar niet actief op Apache — `webuildanddesign.nl`, `linweb412`, 28-07-2026

Beste TransIP Support,

Op 28 juli 2026 hebben wij voor `webuildanddesign.nl` een gecontroleerde
productiepublicatie uitgevoerd via een versioned DocumentRoot-wijziging.

Het controlepaneel accepteerde de nieuwe DocumentRoot
`/sites/wbd-20260728-a0bd364` en toonde deze als actief websitepad. De
publieke website bleef direct daarna via zowel IPv4 als IPv6 echter exact de
oude `index.html` uit `/sites/wbd-20260726-ca3d1bd` serveren.

Onze validator deed na de wijziging acht onafhankelijke HTTPS-metingen. DNS,
transport, TLS en HTTP waren bij alle metingen gezond. De inhoud was echter
steeds aantoonbaar oud:

- publiek: 480 bytes, SHA-256
  `483BB096F17C8535CAA9844FFB8FFF8F44CFF5CC8759AFAEB55392E4F3339A63`;
- verwachte nieuwe index: 1.293 bytes, SHA-256
  `D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77`.

De nieuwe releasebestanden, inclusief de verwachte JS- en CSS-bundels, waren
volledig aanwezig en leesbaar. De preview leverde in hetzelfde meetvenster
exact de nieuwe HTML.

Het Apache-accesslog van backend `linweb412` bevat alle validatorrequests.
Daaruit blijkt dat Apache de requests ontving, maar voor productie telkens
480 bytes en voor preview 1.293 bytes terugstuurde. Browsercache, DNS, TLS,
build, upload en een cache-hit vóór Apache zijn daarmee uitgesloten.

De releaseprocedure classificeerde dit terecht als een kritieke
artefactmismatch. Wij hebben de DocumentRoot teruggezet naar
`/sites/wbd-20260726-ca3d1bd`. De rollback is via IPv4 en IPv6 succesvol
gevalideerd. Productie is stabiel en er wordt geen nieuwe publicatie
uitgevoerd totdat de oorzaak is opgehelderd.

Willen jullie dit technisch escaleren naar het hosting-/platformteam en de
volgende vragen beantwoorden?

1. Is de DocumentRoot-wijziging daadwerkelijk door de actieve Apache
   VirtualHost op `linweb412` overgenomen?
2. Is na de wijziging een VirtualHost-reload uitgevoerd, en wat waren
   tijdstip en resultaat?
3. Is er een bekende propagatie- of activatievertraging tussen het
   controlepaneel en de effectieve webserverconfiguratie?
4. Kan een backend-node of interne mapping tijdelijk een oude VirtualHost
   blijven gebruiken nadat het controlepaneel de nieuwe DocumentRoot toont?
5. Zijn control-plane-, configuratiegeneratie-, reload- of platformlogs voor
   dit tijdvenster beschikbaar?
6. Zijn er bekende incidenten of beperkingen op `linweb412` die dit gedrag
   kunnen verklaren?

Relevante gegevens:

- domein: `webuildanddesign.nl`;
- hostingproduct: shared webhosting `webuil`, productreferentie `202162774`;
- primair siteobject:
  `922418da-6ea2-484c-9c82-547ecdabcf6c`;
- backend uit accesslog: `tb-nl01-linweb412`;
- incidentvenster: 28 juli 2026, circa 22:53–22:57 CEST;
- nieuwe release: `/sites/wbd-20260728-a0bd364`;
- stabiele release: `/sites/wbd-20260726-ca3d1bd`;
- release-ID/commit:
  `a0bd3641bafe83587cf210212f2a1e5f0160632a`;
- validator-user-agent: `Atlas-Release-Validator/1.0`.

In de bijlage vinden jullie het volledige technische incidentrapport, de
publicatiereconstructie, alle validatierapporten, het releasemanifest, de
volledige access- en errorlogs en de fysieke nieuwe `index.html`, inclusief
SHA-256-register.

Wij ontvangen graag de onderliggende oorzaak, het verwachte
activatievenster en een door TransIP ondersteunde manier om toekomstige
DocumentRoot-wijzigingen betrouwbaar als effectief actief te valideren.

Met vriendelijke groet,

Donovan  
We Build And Design

