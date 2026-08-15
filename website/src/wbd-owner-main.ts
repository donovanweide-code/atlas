import "./styles/wbd-owner.css";
import { mountWbdOwnerWorkspace } from "./wbd-owner";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("WBD owner root ontbreekt.");
mountWbdOwnerWorkspace(app);
