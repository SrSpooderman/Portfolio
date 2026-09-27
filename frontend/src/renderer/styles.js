// Vite processes imports, URLs and CSS Modules identically in dev and production.
// Only these owned sheets enter the iframe. No host stylesheet mirroring.
import fonts from "../styles/fonts.css?inline";
import layers from "../styles/layers.css?inline";
import reset from "../styles/reset.css?inline";
import primitives from "../ui/primitives.module.css?inline";
import content from "../blocks/content.module.css?inline";
export const contentCss = [fonts, layers, reset, primitives, content].join(
  "\n",
);
