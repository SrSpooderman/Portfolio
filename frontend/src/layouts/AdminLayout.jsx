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
    <div className="admin">
      <aside>
        <a className="brand" href="/">
          studio<span>®</span>
        </a>
        <small>YOUR PORTFOLIO, YOUR RULES</small>
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
              className={tab === id ? "active" : ""}
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
        <a href="/" target="_blank" rel="noreferrer">
          Ver portfolio <ArrowUpRight size={16} />
        </a>
        <button
          onClick={() =>
            action(async () => {
              await api("/api/auth/logout", "POST");
              setAuth(false);
            })
          }
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </aside>
      <main className="admin-main">
        <header>
          <span>ESPACIO DE TRABAJO / {tab.toUpperCase()}</span>
          <span className="avatar">A</span>
        </header>
        <div className="admin-title">
          <div>
            <span className="eyebrow">TU ESTUDIO DIGITAL</span>
            <h1>
              {tab === "dashboard"
                ? "Hola, vamos a crear."
                : tab === "pages"
                  ? "Tus páginas."
                  : tab === "sections"
                    ? "Tus secciones."
                    : tab === "media"
                      ? "Biblioteca visual."
                      : "Los pequeños detalles."}
            </h1>
            <p>Un lugar para construir, editar y compartir tu trabajo.</p>
          </div>
          <a className="pill" href="/" target="_blank" rel="noreferrer">
            Ver web ↗
          </a>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
