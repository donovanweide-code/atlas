import auroraLandscape from "./assets/images/atlas/atmosphere/atlas-landscape-aurora-v01.webp";
import forestCrossing from "./assets/images/atlas/landscapes/atlas-forest-crossing-v01.webp";
import naturalMaterials from "./assets/images/atlas/materials/atlas-natural-materials-v01.webp";
import routeLandscape from "./assets/images/atlas/navigation/atlas-route-landscape-v01.webp";
import horizonLandscape from "./assets/images/atlas/landscapes/atlas-landscape-horizon-v01.webp";
import travelerHorizon from "./assets/images/atlas/landscapes/atlas-traveler-horizon-v01.webp";
import summitLandscape from "./assets/images/atlas/landscapes/atlas-landscape-summit-v01.webp";
import studioOverview from "./assets/images/atlas/studio/atlas-studio-overview-v01.webp";
import studioWorktable from "./assets/images/atlas/studio/atlas-studio-worktable-v01.webp";
import studioCraftHorizon from "./assets/images/atlas/studio/atlas-studio-craft-horizon-v01.webp";
import studioDigitalFoundation from "./assets/images/atlas/studio/atlas-studio-digital-foundation-v01.webp";

export type AtlasSceneId =
  | "scene-001"
  | "scene-002"
  | "scene-003"
  | "scene-004"
  | "scene-005"
  | "scene-006"
  | "scene-007"
  | "scene-008"
  | "scene-009"
  | "scene-010";

type SceneLayerKind =
  | "horizon"
  | "atmosphere"
  | "forest"
  | "water"
  | "material"
  | "space"
  | "cartography"
  | "traveler";

interface SceneLayer {
  asset: string;
  kind: SceneLayerKind;
  eager?: boolean;
}

export interface AtlasScene {
  id: AtlasSceneId;
  title: string;
  phase: string;
  tone: "midnight" | "aurora" | "first-light" | "horizon" | "summit";
  density: "quiet" | "balanced" | "rich";
  accessibleLabel?: string;
  layers: SceneLayer[];
}

export const firstExpeditionScenes: readonly AtlasScene[] = [
  {
    id: "scene-001",
    title: "The First Horizon",
    phase: "Aankomst",
    tone: "midnight",
    density: "rich",
    accessibleLabel: "Een ervaren ondernemer kijkt vanuit een rustige ontwerpstudio over een open vallei naar de volgende horizon.",
    layers: [
      { asset: studioOverview, kind: "horizon", eager: true },
      { asset: auroraLandscape, kind: "atmosphere", eager: true },
    ],
  },
  {
    id: "scene-002",
    title: "The Hidden Path",
    phase: "Vertraging",
    tone: "aurora",
    density: "balanced",
    layers: [
      { asset: studioWorktable, kind: "space" },
      { asset: auroraLandscape, kind: "atmosphere" },
    ],
  },
  {
    id: "scene-003",
    title: "The First Crossing",
    phase: "Eerste bewuste stap",
    tone: "aurora",
    density: "rich",
    layers: [{ asset: forestCrossing, kind: "water" }],
  },
  {
    id: "scene-004",
    title: "The Visible Foundation",
    phase: "Richting wordt zichtbaar",
    tone: "first-light",
    density: "balanced",
    accessibleLabel:
      "Een scherpe ontwerpstudio in zacht ochtendlicht, waar strategie, UX-structuur, digitale bouwtekeningen en technologie samen één helder fundament vormen.",
    layers: [{ asset: studioDigitalFoundation, kind: "space" }],
  },
  {
    id: "scene-005",
    title: "The Living Map",
    phase: "Verdieping",
    tone: "first-light",
    density: "rich",
    layers: [
      { asset: studioCraftHorizon, kind: "space" },
      { asset: naturalMaterials, kind: "material" },
      { asset: routeLandscape, kind: "cartography" },
    ],
  },
  {
    id: "scene-006",
    title: "The Valley of Work",
    phase: "Herkenning van complexiteit",
    tone: "horizon",
    density: "balanced",
    layers: [{ asset: horizonLandscape, kind: "horizon" }],
  },
  {
    id: "scene-007",
    title: "The First Waypoint",
    phase: "Inzicht",
    tone: "horizon",
    density: "quiet",
    layers: [],
  },
  {
    id: "scene-008",
    title: "The Ridge of Perspective",
    phase: "Overzicht",
    tone: "horizon",
    density: "quiet",
    accessibleLabel: "Een reiziger kijkt vooruit over een lichte, open vallei.",
    layers: [{ asset: travelerHorizon, kind: "traveler" }],
  },
  {
    id: "scene-009",
    title: "The Compass Moment",
    phase: "Oriëntatie en keuze",
    tone: "horizon",
    density: "balanced",
    layers: [],
  },
  {
    id: "scene-010",
    title: "The Next Horizon",
    phase: "Vertrouwen en voortzetting",
    tone: "summit",
    density: "quiet",
    layers: [{ asset: summitLandscape, kind: "horizon" }],
  },
] as const;

const sceneIndex = new Map(firstExpeditionScenes.map((scene) => [scene.id, scene]));

export function getAtlasScene(id: AtlasSceneId): AtlasScene {
  const scene = sceneIndex.get(id);
  if (!scene) throw new Error(`Unknown Atlas scene: ${id}`);
  return scene;
}

export function renderSceneWorld(id: AtlasSceneId): string {
  const scene = getAtlasScene(id);
  const accessibility = scene.accessibleLabel
    ? `role="img" aria-label="${scene.accessibleLabel}"`
    : 'aria-hidden="true"';

  return `
    <div
      class="scene-world scene-world--${scene.density}"
      data-world-for="${scene.id}"
      data-tone="${scene.tone}"
      ${accessibility}
    >
      ${scene.layers
        .map(
          (layer, index) => `
            <div class="scene-world__layer scene-world__layer--${layer.kind}" style="--layer-index:${index}">
              <img
                src="${layer.asset}"
                alt=""
                ${layer.eager ? 'fetchpriority="high"' : 'loading="lazy"'}
                decoding="async"
              >
            </div>`,
        )
        .join("")}
    </div>`;
}
