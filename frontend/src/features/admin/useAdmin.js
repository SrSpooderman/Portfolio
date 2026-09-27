import { useEffect, useState } from "react";
import { api } from "../../api/client";
export function useAdmin() {
  const [auth, setAuth] = useState(null),
    [tab, setTab] = useState("dashboard"),
    [pages, setPages] = useState([]),
    [assets, setAssets] = useState([]),
    [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(null),
    [savedDraft, setSavedDraft] = useState(null),
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
      return true;
    } catch (e) {
      setMessage(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openPage(page) {
    setEditing(page);
    setDraft(page.draft);
    setSavedDraft(page.draft);
    setPreview(false);
    setMessage("");
  }
  async function save(publish = false, data = draft) {
    await api("/api/pages/" + editing.id, "PATCH", {
      title: editing.title,
      slug: editing.slug,
      draft: data,
    });
    if (publish) await api("/api/pages/" + editing.id + "/publish", "POST");
    setDraft(data);
    setSavedDraft(data);
    setEditing((current) =>
      current
        ? {
            ...current,
            draft: data,
            published: publish ? true : current.published,
          }
        : current,
    );
    await refresh();
    setMessage(publish ? "Página publicada." : "Borrador guardado.");
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
    savedDraft,
    message,
    setMessage,
    busy,
    preview,
    setPreview,
    refresh,
    action,
    openPage,
    save,
  };
}
