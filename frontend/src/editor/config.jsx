import { defaults, components } from "../blocks/legacy";
import { schemas } from "./legacyConfig";
import { enhanceConfig } from "./enhanceConfig";
export const config = enhanceConfig(
  Object.fromEntries(
    Object.keys(components).map((type) => [
      type,
      {
        fields: schemas[type],
        defaultProps: defaults[type],
        render: components[type],
      },
    ]),
  ),
);
