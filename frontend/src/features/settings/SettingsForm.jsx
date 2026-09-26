import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
export function SettingsForm({ site, onSave, busy }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: site,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1).max(100),
        profession: z.string().max(150),
        email: z.email().max(200),
        title: z.string().max(200),
        description: z.string().max(500),
      }),
    ),
  });
  return (
    <form className="settings-form" onSubmit={handleSubmit(onSave)}>
      {[
        ["name", "Nombre"],
        ["profession", "Profesión"],
        ["email", "Email"],
        ["title", "Título SEO"],
        ["description", "Descripción SEO"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input {...register(key)} />
          {errors[key] && (
            <small className="error">{errors[key].message}</small>
          )}
        </label>
      ))}
      <p>
        Estos ajustes se aplican inmediatamente. Los textos de los bloques se
        editan en cada página.
      </p>
      <button className="primary" disabled={busy}>
        Guardar configuración
      </button>
    </form>
  );
}
