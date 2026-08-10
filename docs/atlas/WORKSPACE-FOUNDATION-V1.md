# Workspace Foundation v1

## Configuratie

De interne Workspace-shell leest zijn identiteit en navigatie uit `website/src/workspace-config.ts`. Iedere Workspace heeft een unieke `id`, zichtbare naam, korte omschrijving, startlink, compact merkteken en een lijst navigatie-items. Optionele waarden zoals `poweredBy` en `footerLink` bepalen alleen kleine shell-elementen; er is geen afzonderlijke layout per organisatie.

De bestaande Atlas Workspace gebruikt dezelfde configureerbare zijbalk en switcher als We Build And Design. De inhoud van Atlas blijft in `atlas-workspace.ts`; de rustige WBD-paginafundering staat geïsoleerd in `wbd-workspace.ts`.

## Een derde Workspace toevoegen

1. Voeg één nieuwe `WorkspaceConfig` toe aan `workspace-config.ts` en neem die op in `workspaces`.
2. Voeg een interne route toe in `internal-main.ts` en de bestaande ontwikkelrouter in `vite.config.ts`.
3. Laat de pagina-renderer `renderWorkspaceSidebar` gebruiken en geef het actieve navigatie-id door.
4. Voeg gerichte configuratie- en routetests toe.

Deze variant houdt de bestaande `/atlas`-route bewust intact. Een latere uniforme routeconventie kan pas worden overwogen wanneer daar een concrete noodzaak voor bestaat.

## Bewust nog niet gebouwd

Deze fundering bevat geen database, opslagmodel, gebruikersrechten, authenticatie, Repository, communicatieconnector, inbox, e-mail, AI-logica of werkende modules voor organisaties, projecten, documenten en tijdlijn. De Sportpaleis-proof en zijn orderstromen zijn niet aangepast. De WBD-pagina's tonen uitsluitend hun toekomstige doel en de huidige functionele grens.
