import ui from "../ui/primitives.module.css";
import adminLayoutStyles from "./AdminLayout.module.css";
import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Files,
  Image as ImageIcon,
  Settings,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../api/client";
export function AdminLayout({
  tab,
  setTab,
  setMessage,
  action,
  setAuth,
  message,
  children,
}) {
  return (
    <div className={adminLayoutStyles["admin"]}>
      <aside>
        <a className={ui["a"] + " " + ui["brand"]} href="/">
          SpiderPortfolio
        </a>
        <nav>
          {[
            ["dashboard", "Resumen", LayoutDashboard],
            ["pages", "Páginas", Files],
            ["sections", "Secciones", Files],
            ["media", "Imágenes", ImageIcon],
            ["settings", "Configuración", Settings],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                ui["button"] +
                " " +
                (tab === id ? adminLayoutStyles["active"] : "")
              }
              onClick={() => {
                setTab(id);
                setMessage("");
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer" className={ui["a"]}>
          Ver portfolio <ArrowUpRight size={16} />
        </a>
        <button
          onClick={() =>
            action(async () => {
              await api("/api/auth/logout", "POST");
              setAuth(false);
            })
          }
          className={ui["button"]}
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </aside>
      <main className={adminLayoutStyles["admin-main"]}>
        <header>
          <span>SpiderPortfolio</span>
        </header>
        <div className={adminLayoutStyles["admin-title"]}>
          <div>
            <h1 className={ui["h1"]}>
              {tab === "dashboard"
                ? "Resumen"
                : tab === "pages"
                  ? "Páginas"
                  : tab === "sections"
                    ? "Secciones"
                    : tab === "media"
                      ? "Imágenes"
                      : "Configuración"}
            </h1>
          </div>
          <a
            className={ui["a"] + " " + ui["pill"]}
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            Ver web ↗
          </a>
        </div>
        {message && (
          <p className={ui["p"] + " " + ui["notice"]} role="status">
            {message}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
