import React, { useEffect, useState } from "react";
import { registry } from "./registry";
import { Box } from "../blocks/BlockBox";
export function Renderer({ data }) {
  return (
    <>
      {(data?.content || []).map((block, i) => {
        const entry = registry[block.type];
        if (!entry) return null;
        const props = { ...entry.defaults, ...block.props };
        for (const key of entry.slots || []) {
          const children = props[key] || [];
          props[key] = ({ className, style } = {}) => (
            <div className={className} style={style}>
              <Renderer data={{ content: children }} />
            </div>
          );
        }
        return (
          <Box key={block.props?.id || i} {...props}>
            {entry.render(props)}
          </Box>
        );
      })}
    </>
  );
}
