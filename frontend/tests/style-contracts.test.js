import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  palettes,
  tokenNames,
  resolveTheme,
  validatePalette,
} from "../src/theme/palettes.js";
import { resolveBlockStyle } from "../src/blocks/resolveBlockStyle.js";
import {
  compressSection,
  decompose,
  cloneBlock,
} from "../src/blocks/transforms.js";
import { insertIntoContainer } from "../src/editor/sectionInsertion.js";
import {
  exportPayload,
  fileName,
} from "../src/features/export/exportDocument.js";
const templates = JSON.parse(
  fs.readFileSync(
    new URL("../src/features/sections/templates.json", import.meta.url),
  ),
);

test("four palettes implement all interactive states, including safe fallback", () => {
  assert.equal(
    Object.values(palettes).filter((p) => p.mode === "dark").length,
    2,
  );
  assert.equal(
    Object.values(palettes).filter((p) => p.mode === "light").length,
    2,
  );
  for (const palette of Object.values(palettes))
    for (const key of tokenNames) assert.ok(palette[key]);
  for (const id of [null, "missing", "__proto__", "constructor", {}, []])
    assert.equal(resolveTheme(id), palettes.linen);
  assert.throws(() => validatePalette({ ...palettes.linen, focus: "" }));
  assert.throws(() =>
    validatePalette({ ...palettes.linen, accent: "red;display:none" }),
  );
});
test("custom colours and explicit mobile zeroes survive style resolution", () => {
  const props = {
    appearance: {
      padding: 48,
      color: "#123456",
      background: "#abcdef",
      fontSize: 32,
    },
    mobile: { padding: 0, fontSize: 16 },
    placement: { span: 3 },
  };
  const result = resolveBlockStyle(props);
  assert.equal(result.color, "#123456");
  assert.equal(result.background, "#abcdef");
  assert.equal(result["--block-padding"], "48px");
  assert.equal(result["--mobile-padding"], "0px");
  assert.equal(result["--mobile-font"], "16px");
  assert.equal(result["--span"], 3);
  assert.equal(resolveBlockStyle()["--mobile-padding"], "initial");
});
test("portfolio templates contain only editable image-free blocks and survive packing", () => {
  const ids = new Set();
  function walk(block) {
    assert.ok(
      [
        "Section",
        "Container",
        "Grid",
        "Heading",
        "Paragraph",
        "Button",
      ].includes(block.type),
    );
    assert.ok(!ids.has(block.props.id));
    ids.add(block.props.id);
    (block.props.content || []).forEach(walk);
  }
  for (const template of templates) {
    walk(template.content);
    const expanded = decompose(template.content);
    const repacked = compressSection(expanded);
    assert.deepEqual(decompose(repacked), expanded);
  }
  assert.equal(templates.length, 6);
});
test("insertion is immutable, targets a nested container, clones all IDs and is atomic", () => {
  const target = { type: "Grid", props: { id: "target", content: [] } };
  const data = {
    root: { props: { title: "Page" } },
    content: [
      { type: "Container", props: { id: "parent", content: [target] } },
    ],
  };
  const cloned = cloneBlock(templates[0].content);
  const result = insertIntoContainer(data, "target", cloned);
  assert.equal(data.content[0].props.content[0].props.content.length, 0);
  assert.equal(result.content[0].props.content[0].props.content[0], cloned);
  assert.notEqual(cloned.props.id, templates[0].content.props.id);
  assert.equal(insertIntoContainer(data, "missing", cloned), data);
});
test("export preserves the complete document and uses safe filenames", () => {
  const data = {
    root: { props: { title: "Example" } },
    content: templates.map((t) => t.content),
  };
  const payload = exportPayload({
    data,
    name: "Example",
    kind: "page",
    theme: "crimson",
  });
  assert.deepEqual(payload.data, data);
  assert.notEqual(payload.data, data);
  assert.equal(payload.theme, "crimson");
  assert.equal(JSON.parse(JSON.stringify(payload)).data.content.length, 6);
  assert.equal(
    fileName("../../Mi página <script>", "json"),
    "Mi-pagina-script.json",
  );
});
test("owned CSS is layered and does not target vendor classes or override pointer handling", () => {
  const files = fs
    .readdirSync(new URL("../src/", import.meta.url), { recursive: true })
    .filter((p) => p.endsWith(".css"));
  for (const file of files) {
    const css = fs.readFileSync(
      new URL("../src/" + file, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(css, /\[class\*=/, file);
    assert.doesNotMatch(css, /!important|pointer-events\s*:/, file);
    if (file.endsWith(".module.css"))
      assert.match(css, /@layer (primitives|content|components)/, file);
  }
  const entry = fs.readFileSync(
    new URL("../src/styles/index.css", import.meta.url),
    "utf8",
  );
  assert.match(entry, /puck.css" layer\(vendor\)/);
  const renderer = fs.readFileSync(
    new URL("../src/renderer/styles.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(renderer, /editor\//);
});
