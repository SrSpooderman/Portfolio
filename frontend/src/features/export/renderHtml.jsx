import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Renderer } from "../../renderer/Renderer";
import { contentCss } from "../../renderer/styles";
import { resolveTheme, tokenNames } from "../../theme/palettes";
import styles from "../../blocks/content.module.css";

export function renderHtml(payload, origin) {
  const palette = resolveTheme(payload.theme);
  const variables = Object.fromEntries(
    tokenNames.map((name) => [`--sp-${name}`, palette[name]]),
  );
  const markup = renderToStaticMarkup(
    <html
      lang="es"
      data-sp-theme={payload.theme}
      style={{ ...variables, colorScheme: palette.mode }}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{payload.name}</title>
        <base href={origin + "/"} />
        <style>{contentCss}</style>
      </head>
      <body>
        <main className={styles.public}>
          <Renderer data={payload.data} />
        </main>
      </body>
    </html>,
  );
  return "<!doctype html>\n" + markup;
}
