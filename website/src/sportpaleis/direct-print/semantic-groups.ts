import { boundsForContours, quantizeMm, translateContours } from "./geometry.ts";
import type { CutObject, SemanticPhysicalMember, VectorContour } from "./types.ts";

/**
 * Houdt ieder exemplaar van een multi-digit rugnummer herkenbaar als één
 * fysiek snijobject. De groep kan daarna als rigide geheel 0°/90° nesten.
 * De originele digitcontouren worden uitsluitend vertaald; nooit geschaald.
 */
export function groupSemanticNumberObjects(objects: readonly CutObject[], physicalRecognitionGapMm = 6.4): CutObject[] {
  if (!Number.isFinite(physicalRecognitionGapMm) || physicalRecognitionGapMm < 0) throw new Error("De fysieke herkenningsafstand moet een niet-negatief aantal millimeters zijn.");
  const grouped = new Map<string, CutObject[]>();
  const passthrough: CutObject[] = [];
  for (const object of objects) {
    if (object.semanticGroup?.kind !== "MULTI_DIGIT_NUMBER" || object.semanticGroup.digitCount < 2 || object.semanticGroup.physicalMembers?.length) {
      passthrough.push(object);
      continue;
    }
    const group = grouped.get(object.semanticGroup.id) ?? [];
    group.push(object);
    grouped.set(object.semanticGroup.id, group);
  }

  const composites = [...grouped.values()].map((members) => {
    const ordered = [...members].sort((left, right) => (left.semanticGroup?.digitIndex ?? 0) - (right.semanticGroup?.digitIndex ?? 0));
    const first = ordered[0];
    const semantic = first.semanticGroup!;
    if (ordered.length !== semantic.digitCount) throw new Error(`Rugnummer ${semantic.value} mist één of meer fysieke cijfers.`);
    if (ordered.some(({ material, productionRule, semanticGroup, assetIdentity }, index) => material.code !== first.material.code
      || productionRule.mirror !== first.productionRule.mirror
      || productionRule.rotation !== first.productionRule.rotation
      || semanticGroup?.value !== semantic.value
      || semanticGroup?.digitIndex !== index
      || semanticGroup?.digit !== semantic.value[index]
      || semanticGroup?.garmentCompositionSpacingMm !== semantic.garmentCompositionSpacingMm
      || assetIdentity?.assetId !== first.assetIdentity?.assetId
      || assetIdentity?.assetVersion !== first.assetIdentity?.assetVersion)) throw new Error(`Rugnummer ${semantic.value} bevat incompatibele fysieke cijfers.`);

    const contourSpacingMm = Number.isFinite(semantic.garmentCompositionSpacingMm)
      ? semantic.garmentCompositionSpacingMm
      : physicalRecognitionGapMm;
    let cursorX = 0;
    const contours: VectorContour[] = [];
    const physicalMembers: SemanticPhysicalMember[] = [];
    for (const member of ordered) {
      const memberBounds = boundsForContours(member.contours);
      const normalized = translateContours(member.contours, { x: -memberBounds.minX, y: -memberBounds.minY });
      const translated = translateContours(normalized, { x: cursorX, y: 0 });
      contours.push(...translated);
      physicalMembers.push({
        sourceObjectId: member.id,
        digit: member.semanticGroup!.digit,
        digitIndex: member.semanticGroup!.digitIndex,
        contourIds: translated.map(({ id }) => id),
        relativePlacementMm: { x: quantizeMm(cursorX), y: 0 },
        sourceBoundsMm: boundsForContours(normalized),
        ...(member.assetIdentity ? { assetIdentity: member.assetIdentity } : {}),
      });
      // De authoritative contourafstand is onderdeel van de compositie.
      cursorX = quantizeMm(cursorX + memberBounds.width + contourSpacingMm);
    }
    const compositeBounds = boundsForContours(contours);
    return {
      ...first,
      id: `${semantic.id}:physical-group`,
      label: `Rugnummer ${semantic.value} · exemplaar ${semantic.copyIndex ?? 1}/${semantic.copyCount ?? 1}`,
      printType: "Herkenbare multi-digit rugnummergroep",
      requestedPhysicalSizeMm: { widthMm: compositeBounds.width, heightMm: compositeBounds.height },
      vectorProfile: ordered.map(({ vectorProfile }) => vectorProfile).filter(Boolean).join(" + "),
      semanticGroup: { ...semantic, physicalMembers },
      assetIdentity: undefined,
      contours,
    } satisfies CutObject;
  });

  return [...passthrough, ...composites];
}
