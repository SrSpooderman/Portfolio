import { useEffect, useState } from "react";
import { api } from "../../api/client";
export function useAdmin() {
  const [auth, setAuth] = useState(null),
    [tab, setTab] = useState("dashboard"),
    [pages, setPages] = useState([]),
    [assets, setAssets] = useState([]),
    [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const refresh = async () => {
    const [p, a] = await Promise.all([api("/api/pages"), api("/api/assets")]);
    setPages(p);
    setAssets(a);
  };
  useEffect(() => {
    api("/api/auth/me")
      .then(() => setAuth(true))
      .catch(() => setAuth(false));
  }, []);
  useEffect(() => {
    if (auth) refresh().catch((e) => setMessage(e.message));
  }, [auth]);
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
  async function save(publish = false, data = draft) {
    await api("/api/pages/" + editing.id, "PATCH", {
      title: editing.title,
      slug: editing.slug,
      draft: data,
    });
    if (publish) await api("/api/pages/" + editing.id + "/publish", "POST");
    await refresh();
    setMessage(
      publish
        ? "Publicado. Tu web ya está actualizada."
        : "Borrador guardado. La web pública no cambia.",
    );
  }
  return {
    auth,
    setAuth,
    tab,
    setTab,
    pages,
    assets,
    editing,
    setEditing,
    draft,
    setDraft,
    message,
    setMessage,
    busy,
    preview,
    setPreview,
    refresh,
    action,
    save,
  };
}
