import ui from "../../ui/primitives.module.css";
import loginStyles from "./Login.module.css";
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
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    ),
    defaultValues: {
      username: "superadmin",
    },
  });
  return (
    <main className={loginStyles["login"]}>
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
        <h1 className={ui["h1"]}>SpiderPortfolio</h1>
        <label>
          Usuario
          <input
            autoComplete="username"
            {...register("username")}
            className={ui["input"]}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className={ui["input"]}
          />
        </label>
        {(error || Object.keys(errors).length > 0) && (
          <p role="alert" className={ui["p"] + " " + ui["error"]}>
            {error || "Completa ambos campos"}
          </p>
        )}
        <button
          className={ui["button"] + " " + ui["primary"]}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
        <a href="/" className={ui["a"]}>
          ← Volver al portfolio
        </a>
      </form>
    </main>
  );
}
