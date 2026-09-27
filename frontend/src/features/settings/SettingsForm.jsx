import ui from "../../ui/primitives.module.css";
import settingsFormStyles from "./SettingsForm.module.css";
import { ThemePicker } from "./ThemePicker";
import { defaultTheme, themeIds } from "../../theme/palettes";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
export function SettingsForm({ site, onSave, busy, initial = false }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      ...site,
      theme: themeIds.includes(site.theme) ? site.theme : defaultTheme,
    },
    resolver: zodResolver(
      z.object({
        theme: z.enum(themeIds),
        name: z.string().trim().min(1, "Introduce tu nombre").max(100),
        profession: z.string().max(150),
        email: z.email("Introduce un email válido").max(200),
        title: z.string().max(200),
        description: z.string().max(500),
      }),
    ),
  });
  return (
    <form
      className={settingsFormStyles["settings-form"]}
      onSubmit={handleSubmit(onSave)}
    >
      {[
        ["name", "Nombre"],
        ["profession", "Profesión"],
        ["email", "Email"],
        ["title", "Título de la web"],
        ["description", "Descripción"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type={key === "email" ? "email" : "text"}
            autoComplete={
              key === "name" ? "name" : key === "email" ? "email" : "off"
            }
            {...register(key)}
            className={ui["input"]}
          />
          {errors[key] && (
            <small className={ui["small"] + " " + ui["error"]}>
              {errors[key].message}
            </small>
          )}
        </label>
      ))}
      <ThemePicker register={register} error={errors.theme} />
      <button className={ui["button"] + " " + ui["primary"]} disabled={busy}>
        {busy ? "Guardando…" : initial ? "Crear portfolio" : "Guardar"}
      </button>
    </form>
  );
}
