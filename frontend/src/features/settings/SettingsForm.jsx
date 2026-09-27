import ui from "../../ui/primitives.module.css";
import settingsFormStyles from "./SettingsForm.module.css";
import { ThemePicker } from "./ThemePicker";
import { defaultTheme, themeIds } from "../../theme/palettes";
import { applyDocumentTheme } from "../../theme/documentTheme";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
export function SettingsForm({ site, onSave, busy, initial = false }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      ...site,
      theme: themeIds.includes(site.theme) ? site.theme : defaultTheme,
      start_status: "published",
    },
    resolver: zodResolver(
      z.object({
        theme: z.enum(themeIds),
        name: z.string().trim().min(1, "Introduce tu nombre").max(100),
        profession: z.string().max(150),
        email: z.email("Introduce un email válido").max(200),
        title: z.string().max(200),
        description: z.string().max(500),
        start_status: z.enum(["published", "draft"]).optional(),
      }),
    ),
  });
  const selectedTheme = watch("theme");
  const [previewTheme, setPreviewTheme] = useState(selectedTheme);
  useEffect(() => {
    applyDocumentTheme(document, previewTheme);
    return () => applyDocumentTheme(document, site.theme);
  }, [previewTheme, site.theme]);
  useEffect(() => {
    setPreviewTheme(selectedTheme);
  }, [selectedTheme]);
  function submit(values) {
    const payload = { ...values };
    if (!initial) delete payload.start_status;
    onSave(payload);
  }
  const fields = initial
    ? [
        ["name", "Nombre"],
        ["profession", "Profesión"],
        ["email", "Email"],
      ]
    : [
        ["name", "Nombre"],
        ["profession", "Profesión"],
        ["email", "Email"],
        ["title", "Título de la web"],
        ["description", "Descripción"],
      ];
  return (
    <form
      className={settingsFormStyles["settings-form"]}
      onSubmit={handleSubmit(submit)}
    >
      {fields.map(([key, label]) => (
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
      {initial && (
        <>
          <input type="hidden" defaultValue="" {...register("title")} />
          <input type="hidden" defaultValue="" {...register("description")} />
          <fieldset className={settingsFormStyles["publish-fieldset"]}>
            <legend>Portada inicial</legend>
            <label>
              <input
                type="radio"
                value="published"
                {...register("start_status")}
                defaultChecked
              />
              Publicada
            </label>
            <label>
              <input type="radio" value="draft" {...register("start_status")} />
              Borrador
            </label>
          </fieldset>
        </>
      )}
      <input type="hidden" {...register("theme")} />
      <ThemePicker
        value={selectedTheme}
        preview={previewTheme}
        onPreview={setPreviewTheme}
        onApply={() =>
          setValue("theme", previewTheme, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onCancel={() => setPreviewTheme(selectedTheme)}
        error={errors.theme}
      />
      <button className={ui["button"] + " " + ui["primary"]} disabled={busy}>
        {busy ? "Guardando…" : initial ? "Crear portfolio" : "Guardar"}
      </button>
    </form>
  );
}
