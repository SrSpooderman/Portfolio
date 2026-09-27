import React, { useState } from "react";
import { api } from "../../api/client";
import { SettingsForm } from "../settings/SettingsForm";
import ui from "../../ui/primitives.module.css";
import styles from "./SetupScreen.module.css";
export function SetupScreen({ site, onComplete }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className={styles.root}>
      <header>
        <strong>SpiderPortfolio</strong>
        <h1 className={ui.h1}>Configuración inicial</h1>
      </header>
      <SettingsForm
        site={site}
        busy={busy}
        initial
        onSave={async (values) => {
          setBusy(true);
          setError("");
          try {
            onComplete(await api("/api/setup", "POST", values));
          } catch (error) {
            setError(error.message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && (
        <p className={ui.error} role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
