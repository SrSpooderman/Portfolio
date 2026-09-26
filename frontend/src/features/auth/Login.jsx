import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../api/client";
export function Login({ onLogin }) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(
      z.object({ username: z.string().min(1), password: z.string().min(1) }),
    ),
    defaultValues: { username: "superadmin" },
  });
  return (
    <main className="login">
      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            await api("/api/auth/login", "POST", values);
            onLogin();
          } catch (e) {
            setError(e.message);
          }
        })}
      >
        <span className="eyebrow">PORTFOLIO / STUDIO</span>
        <h1>Tu espacio creativo.</h1>
        <p>Entra para dar forma a tu próxima idea.</p>
        <label>
          Usuario
          <input autoComplete="username" {...register("username")} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </label>
        {(error || Object.keys(errors).length > 0) && (
          <p role="alert" className="error">
            {error || "Completa ambos campos"}
          </p>
        )}
        <button className="primary" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar al backoffice ↗"}
        </button>
        <a href="/">← Volver al portfolio</a>
      </form>
    </main>
  );
}
