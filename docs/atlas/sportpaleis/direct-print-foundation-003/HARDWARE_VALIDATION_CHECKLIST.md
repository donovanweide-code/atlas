# HARDWARE VALIDATION 001 - Summa S75T

1. Plan een rustig moment; laat een lopende productieopdracht eerst volledig afronden.
2. Noteer/fotografeer typeplaatje `S75T`, serienummer `410810-10007`, ROM/firmware en de huidige USB Class. Wijzig niets.
3. Noteer Windows-versie, WinPlot-versie, Summa-driver en het ingestelde WinPlot USB-poortnummer.
4. Sluit Illustrator en WinPlot. Installeer en upgrade niets.
5. Zoek het bestaande `SummaUsb.dll`-pad; verplaats of vervang het bestand niet.
6. Voer alleen `summa-bridge-probe.ps1` uit met dat DLL-pad. De probe inventariseert PnP, Hardware IDs, Instance ID, Container ID, driver, DLL-bitness en handtekening; hij verzendt niets.
7. Bewaar de JSON-uitvoer als `summa-s75t-probe-410810-10007.json` en stuur die naar WBD.
8. Start WinPlot opnieuw en bevestig dat de bestaande cutterconfiguratie nog zichtbaar is. Stuur geen testjob.
9. STOP. Geen `PIPE01`, DM/PL of fysieke snede zonder een afzonderlijke expliciete GO voor Hardware Validation 002.
