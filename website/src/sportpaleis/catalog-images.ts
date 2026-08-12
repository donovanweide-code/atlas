import homeShirt from "../assets/images/sportpaleis/asc-shirt-home.webp";
import matchShorts from "../assets/images/sportpaleis/asc-match-shorts.webp";
import socks from "../assets/images/sportpaleis/asc-socks.webp";
import polo from "../assets/images/sportpaleis/asc-polo.webp";
import jacket from "../assets/images/sportpaleis/asc-full-zip-jacket.webp";
import zipTop from "../assets/images/sportpaleis/asc-zip-top.webp";
import pants from "../assets/images/sportpaleis/asc-training-pants.webp";
import awayShirt from "../assets/images/sportpaleis/asc-shirt-away.webp";
import keeper from "../assets/images/sportpaleis/asc-reserve-shirt.webp";
import trainingShirt from "../assets/images/sportpaleis/asc-training-shirt.webp";
import livePlaceholder from "../assets/images/sportpaleis/sportpaleis-live-placeholder.svg";

const images: Record<string, string> = {
  "asc-shirt-home": homeShirt,
  "asc-match-shorts": matchShorts,
  "asc-socks": socks,
  "asc-polo": polo,
  "asc-full-zip-jacket": jacket,
  "asc-zip-top": zipTop,
  "asc-training-pants": pants,
  "asc-shirt-away": awayShirt,
  "asc-reserve-shirt": keeper,
  "asc-training-shirt": trainingShirt,
  "sp-live-placeholder": livePlaceholder,
};

const liveImages = import.meta.glob<string>("../assets/images/sportpaleis/live-catalog/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
for (const [path, url] of Object.entries(liveImages)) {
  const key = path.match(/\/(sp-live-[^/]+)\.webp$/)?.[1];
  if (key) images[key] = url;
}

export function articleImage(imageKey?: string): string {
  return imageKey ? images[imageKey] ?? homeShirt : homeShirt;
}
