# Bijlagenoverzicht en mogelijke vervolgvragen

## 1. Bijlagenregister

| Bijlage | Omvang | SHA-256 | Betekenis |
|---|---:|---|---|
| `README.md` | 2.072 | `0127D7A89681CC6592B2990881C9F4CB849BC2369F60B8230DB8993BACD978A0` | Ingang en samenvatting van het supportpakket |
| `TECHNICAL-INCIDENT-REPORT.md` | 14.743 | `434F17BC50188A6AACFBBF8911509EFB0FFA1F5B3A40EA0B2C967D5015386739` | Zelfstandig technisch incidentrapport |
| `SUPPORT-MAIL.md` | 3.612 | `271998AC4C13CD4E1F59EDBB2C1F3D8DA17C361772F5166BB5B9DBA51F59EC32` | Begeleidende supportmail |
| `PRODUCTION-INFRASTRUCTURE-INVESTIGATION-001.md` | 21.777 | `A373EB90483FC9EE847D833636683C8A48AA205CC50316752A659749D48D9724` | Volledige interne infrastructuurreconstructie |
| `WBD-2026-07-28-a0bd364-PUBLICATION-ATTEMPT-002.md` | 8.270 | `09AD9F2232991488B64525DF9B290D240E6BED30400983E1F8E449EB484FAF20` | Publicatietijdlijn, preflight, switch, mismatch en rollback |
| `WBD-2026-07-28-a0bd364-PRODUCTION-CANDIDATE.md` | 10.094 | `5ADC7E2C934DC58F4028E34A28DF59AF10F777B06C48A388C5F423824923CA37` | Identiteit en verificatie van de releasekandidaat |
| `WBD-2026-07-28-a0bd364.manifest.json` | 4.745 | `9310B58FE5A547098C63FCC4F2A962273E479973D724A3A771BF2ABB2B5FE698` | Canonieke bestandshashes van de release |
| `publication-002-final-preflight-ipv4.json` | 23.114 | `1000CBC9C2C88FC1302E790E503DD8C27F350D05AD543BBA400D82EBDE87AE7D` | Verse geldige IPv4-preflight vóór de switch |
| `publication-002-final-preflight-ipv6.json` | 23.337 | `7A148F1E764081D235F2640DCDB57016711EFC714BDC973A2E725118DADA1D4B` | Verse geldige IPv6-preflight vóór de switch |
| `publication-002-final-preflight-decision.json` | 867 | `6538594ABFE62C51EF3E31508A177EAB402ADC92DB89E875359D69C03F562FA6` | Gecombineerd `Pass`/`switch-eligible`-besluit |
| `publication-002-post-ipv4.json` | 23.113 | `CCC5AE3749E1DA160EAAA22F0D8128CB50D3014DEF71EE663C03375837CF2722` | IPv4-bewijs van oude HTML na de switch |
| `publication-002-post-ipv6.json` | 23.337 | `266A6C9E71557048C7EA13D6D81EED7773E319441EA6070475952179E338E737` | IPv6-bewijs van oude HTML na de switch |
| `publication-002-post-decision.json` | 911 | `5484FD679992DE148BD042FC786333DFF37E7558E8F0B52A55BCB459412A009A` | Gecombineerd `Production failed`/`rollback`-besluit |
| `publication-002-rollback-ipv4.json` | 23.115 | `4DE08BC52D1DD77BC9560E34AC4DE6DB0D00EECC47B5BF9D15D5364E9788C8E9` | Succesvolle IPv4-herstelvalidatie |
| `publication-002-rollback-ipv6.json` | 23.339 | `8A4FA996FD9C7FF9E744E839002CD1ACA7BE83C78C78BE67E76A8ECA56D67B8A` | Succesvolle IPv6-herstelvalidatie |
| `publication-002-rollback-decision.json` | 873 | `74F6793721895AA9F5B55EA217AFD44939FAC5235073B23C6D4D6CC060A3CAC2` | Gecombineerd `Pass`-besluit na rollback |
| `access-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z` | 355.092 | `CD3FC743CC1D8F51010A4573508EB3A9E2219CA43FA4823BFB55776EFCC6B866` | Apache-bewijs dat alle validatorrequests de backend bereikten |
| `error-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z` | 335.014 | `3F227A0A3702601FF56FA3D68E1D137521D806D500EFC96A1F7FC0FB3E1507F1` | Apache-/platformcontext en incidentvenster |
| `new-release-index.html` | 1.293 | `D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77` | Fysieke `index.html` uit de nieuwe release-directory |

De uiteindelijke ZIP-hash wordt na export afzonderlijk gerapporteerd. Het
bijlagenregister bevat bewust geen eigen hash, omdat een bestand zijn eigen
definitieve hash niet recursief kan vastleggen.

## 2. Aanvullende informatie die TransIP eventueel kan opvragen

TransIP kan voor administratieve of technische koppeling nog vragen om:

- klantnummer of accountreferentie van de TransIP-account;
- ticketnummer nadat de melding is aangemaakt;
- de commerciële pakketnaam zoals TransIP die intern registreert;
- bevestiging van de tijdzone van control-plane- en serverlogs;
- een control-plane audit-export of interne wijzigings-ID van de
  DocumentRoot-actie;
- eventuele interne platform-, reload- of configuratiegeneratielogs;
- bevestiging welke backend-node(s) het domein tijdens het incident bedienden;
- de effectieve Apache VirtualHost-configuratie rond het incidentvenster;
- de Nginx-upstreammapping naar `linweb412`;
- bevestiging hoe lang de bijgevoegde hostinglogs worden bewaard;
- een TransIP-incident- of storingsreferentie wanneer er rond 28 juli 2026
  een platformafwijking was.

De volgende informatie is al in het pakket opgenomen en hoeft in beginsel
niet opnieuw te worden opgevraagd:

- domein, DNS-adressen en betrokken backend;
- incidenttijdvenster in UTC en CEST;
- bron-IP's van de validator;
- release- en commit-ID's;
- oude en nieuwe DocumentRoot;
- responsehashes en bundelnamen;
- volledige Apache access- en errorlogs;
- alle preflight-, post-switch- en rollbackrapporten;
- bestandshashes van de fysieke nieuwe release-index.

## 3. Privacy en veiligheid van het pakket

Het pakket bevat technische serverlogs met IP-adressen en user-agents. Deel
het uitsluitend via het beveiligde TransIP-supportkanaal.

Het pakket bevat geen:

- wachtwoorden;
- SSH-sleutels;
- API-sleutels;
- sessiecookies;
- betaalgegevens;
- klantinhoud buiten reguliere webserverlogregels.
