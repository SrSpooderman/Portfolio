import React, { useEffect, useState } from "react";
import { SectionEditor } from "./SectionEditor";
import { SectionsList } from "./SectionsList";
import { emptySection } from "./sectionModel";
import { request } from "../../api/components";
export function SectionsManager() {
  const [sections, setSections] = useState([]),
    [editing, setEditing] = useState(null),
    [name, setName] = useState(""),
    [data, setData] = useState(null),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const refresh = async () => setSections(await request());
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);
  async function action(fn) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(section) {
    setEditing(section);
    setName(section.name);
    setData({ content: [section.content], root: {} });
    setPreview(false);
    setMessage("");
  }
  async function save(value = data) {
    if (!name.trim()) throw Error("Escribe un nombre para la sección.");
    const wrapper = emptySection();
    wrapper.props.appearance = { padding: 0 };
    wrapper.props.content = value.content;
    const content = value.content.length === 1 ? value.content[0] : wrapper;
    const saved = await request(
      editing.id ? "/" + editing.id : "",
      editing.id ? "PATCH" : "POST",
      { name: name.trim(), content },
    );
    setEditing({ ...saved, id: saved.id });
    await refresh();
    setMessage(
      "Sección guardada. Ya puedes insertarla desde el editor de páginas.",
    );
  }
  if (editing)
    return (
      <SectionEditor
        {...{
          setEditing,
          name,
          setName,
          preview,
          setPreview,
          busy,
          action,
          save,
          message,
          data,
          setData,
        }}
      />
    );

  return (
    <SectionsList {...{ sections, open, message, busy, action, refresh }} />
  );
}
