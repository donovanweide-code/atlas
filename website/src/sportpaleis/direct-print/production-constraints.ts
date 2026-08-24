/**
 * Fysiek bewezen bovengrens van de huidige Sportpaleis plotter/foliebaan.
 * De operationele machineconfiguratie mag een smallere veilige baan kiezen,
 * maar nooit stil boven deze hardwaregrens uitkomen.
 */
export const SPORTPALEIS_MACHINE_CONSTRAINTS = Object.freeze({
  maximumSafeTrackWidthMm: 450,
});
