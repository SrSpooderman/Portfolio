import { SetupScreen } from "../setup/SetupScreen";
import ui from "../../ui/primitives.module.css";
import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAdmin } from "./useAdmin";
import { Login } from "../auth/Login";
import { AdminLayout } from "../../layouts/AdminLayout";
import { Dashboard } from "../dashboard/Dashboard";
import { PagesPanel } from "../pages/PagesPanel";
import { PageEditor } from "../pages/PageEditor";
import { MediaPanel } from "../media/MediaPanel";
import { SectionsManager } from "../sections/SectionsManager";
import { SettingsForm } from "../settings/SettingsForm";
export function Admin({ site, setSite }) {
  const {
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
  } = useAdmin();
  if (auth === null)
    return <div className={ui["loading"]}>Comprobando sesión…</div>;
  if (!auth) return <Login onLogin={() => setAuth(true)} />;
  if (site.setup_required)
    return (
      <SetupScreen
        site={site}
        onComplete={(next) => {
          setSite(next);
          refresh().catch((error) => setMessage(error.message));
        }}
      />
    );
  if (editing)
    return (
      <PageEditor
        {...{
          editing,
          preview,
          setPreview,
          setEditing,
          busy,
          action,
          save,
          message,
          draft,
          setDraft,
          savedDraft,
          site,
        }}
      />
    );
  return (
    <AdminLayout
      {...{
        tab,
        setTab,
        setMessage,
        action,
        setAuth,
        message,
      }}
    >
      {tab === "dashboard" && (
        <Dashboard pages={pages} assets={assets} setTab={setTab} />
      )}
      {tab === "pages" && (
        <PagesPanel
          pages={pages}
          busy={busy}
          action={action}
          refresh={refresh}
          setMessage={setMessage}
          openPage={openPage}
        />
      )}
      {tab === "media" && (
        <MediaPanel
          assets={assets}
          busy={busy}
          action={action}
          refresh={refresh}
          setMessage={setMessage}
        />
      )}
      {tab === "sections" && <SectionsManager />}
      {tab === "settings" && (
        <SettingsForm
          site={site}
          busy={busy}
          onSave={(values) =>
            action(async () => {
              setSite(await api("/api/settings", "PATCH", values));
              setMessage("Configuración guardada.");
            })
          }
        />
      )}
    </AdminLayout>
  );
}
