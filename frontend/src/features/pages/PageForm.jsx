import ui from "../../ui/primitives.module.css";
import pageFormStyles from "./PageForm.module.css";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
export function PageForm({ onSave, busy }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1).max(100),
        slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
      }),
    ),
  });
  return (
    <form
      className={pageFormStyles["inline-form"]}
      onSubmit={handleSubmit(onSave)}
    >
      <input
        placeholder="Nombre de página"
        aria-label="Nombre"
        {...register("title")}
        className={ui["input"]}
      />
      <input
        placeholder="slug-de-pagina"
        aria-label="Slug"
        {...register("slug")}
        className={ui["input"]}
      />
      <button className={ui["button"] + " " + ui["primary"]} disabled={busy}>
        Crear página +
      </button>
      {Object.keys(errors).length > 0 && (
        <small role="alert" className={ui["small"]}>
          Introduce un nombre y un slug con letras minúsculas, números o
          guiones.
        </small>
      )}
    </form>
  );
}
