import React, { useEffect, useState } from "react";
export const safeUrl = (url = "") =>
  /^(https?:\/\/|mailto:|\/|#)/i.test(url) && !url.startsWith("//") ? url : "#";
export const defaults = {
  Hero: {
    eyebrow: "DISPONIBLE PARA NUEVOS PROYECTOS",
    title: "Ideas claras.\nExperiencias memorables.",
    description:
      "Diseño y desarrollo productos digitales que conectan a las personas con las marcas. De la primera idea al último detalle.",
    button: "Explora mi trabajo",
    link: "#proyectos",
  },
  About: {
    title: "Diseño con intención.\nCódigo con propósito.",
    description:
      "Soy Alex, diseñador y desarrollador independiente. Combino estrategia, sensibilidad visual y tecnología para convertir problemas complejos en experiencias sencillas.",
    detail: "Desde Madrid, colaborando con personas de cualquier lugar.",
  },
  Projects: {
    title: "Una selección de mi trabajo",
    items: [
      {
        title: "Forma Studio",
        category: "IDENTIDAD · WEB DESIGN",
        description: "Una nueva perspectiva para un estudio de arquitectura.",
        url: "#contacto",
        color: "#e5e6df",
      },
      {
        title: "Orbit Finance",
        category: "PRODUCT DESIGN · DESARROLLO",
        description: "Las finanzas personales, un poco más humanas.",
        url: "#contacto",
        color: "#dedcf0",
      },
      {
        title: "Terra Objects",
        category: "E-COMMERCE · DIRECCIÓN DE ARTE",
        description: "Objetos cotidianos con historias extraordinarias.",
        url: "#contacto",
        color: "#ecdacb",
      },
    ],
  },
  Text: {
    title: "Un espacio para tus ideas",
    text: "Cuenta aquí tu historia.",
  },
  Skills: {
    title: "De la idea al lanzamiento",
    items: [
      {
        title: "01 / Estrategia",
        description: "Investigación, concepto y dirección creativa.",
      },
      {
        title: "02 / Diseño",
        description: "Identidad, interfaces y experiencias digitales.",
      },
      {
        title: "03 / Desarrollo",
        description: "Webs rápidas, accesibles y fáciles de usar.",
      },
    ],
  },
  Contact: {
    title: "¿Tienes algo\nen mente?",
    email: "hola@example.com",
    text: "Las mejores ideas empiezan con una conversación.",
  },
  Image: { src: "", alt: "Descripción de la imagen", caption: "" },
  Spacer: { height: 64 },
  CTA: {
    title: "Hagamos algo especial.",
    label: "Hablemos",
    url: "mailto:hola@example.com",
  },
};
export const components = {
  Hero: ({ eyebrow, title, description, button, link }) => (
    <section className="hero hero-text-only">
      <div className="hero-copy">
        <span className="eyebrow">
          <i />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        <a className="pill dark" href={safeUrl(link)}>
          {button} <span>↗</span>
        </a>
        <div className="hero-bottom">
          DISEÑO + TECNOLOGÍA <span>EST. 2026 — MADRID, ES</span>
        </div>
      </div>
    </section>
  ),
  About: ({ title, description, detail }) => (
    <section id="sobre-mi" className="about section">
      <span className="eyebrow">UN POCO SOBRE MÍ</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <small>{detail}</small>
      </div>
    </section>
  ),
  Projects: ({ title, items = [] }) => (
    <section id="proyectos" className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PROYECTOS DESTACADOS</span>
          <h2>{title}</h2>
        </div>
        <span>({String(items.length).padStart(2, "0")})</span>
      </div>
      <div className="projects">
        {items.map((p, i) => (
          <a key={i} className="project" href={safeUrl(p.url)}>
            <div
              className={"project-art design-" + (i % 3)}
              style={{ background: p.color }}
            >
              {i % 3 === 0 ? (
                <div className="forma">
                  forma<span>ARCHITECTURE & LIVING</span>
                  <div className="building" />
                </div>
              ) : i % 3 === 1 ? (
                <div className="finance">
                  <span>orbit ↗</span>
                  <small>Tu balance total</small>
                  <strong>24.680,00 €</strong>
                  <div className="bars">
                    {[30, 50, 40, 75, 55, 90, 100].map((h, j) => (
                      <i key={j} style={{ height: h }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="terra">
                  <span>terra.</span>
                  <div className="vase" />
                  <small>LESS, BUT BETTER.</small>
                </div>
              )}
              <b className="project-arrow">↗</b>
            </div>
            <div className="project-info">
              <h3>{p.title}</h3>
              <small>{p.category}</small>
            </div>
            <p>{p.description}</p>
          </a>
        ))}
      </div>
    </section>
  ),
  Text: ({ title, text }) => (
    <section className="section prose">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  ),
  Skills: ({ title, items = [] }) => (
    <section className="section services">
      <h2>{title}</h2>
      <div className="service-grid">
        {items.map((x, i) => (
          <div key={i}>
            <h3>{x.title}</h3>
            <p>{x.description}</p>
          </div>
        ))}
      </div>
    </section>
  ),
  Contact: ({ title, email, text }) => (
    <section id="contacto" className="contact section">
      <span className="eyebrow">EL SIGUIENTE PROYECTO PODRÍA SER EL TUYO</span>
      <h2>
        {title}
        <span>↗</span>
      </h2>
      <p>{text}</p>
      <a href={safeUrl("mailto:" + email)}>{email} ↗</a>
    </section>
  ),
  Image: ({ src, alt, caption }) => (
    <figure className="section">
      {src ? (
        <img className="content-image" src={safeUrl(src)} alt={alt} />
      ) : (
        <div className="image-placeholder">
          Añade una imagen desde la biblioteca multimedia
        </div>
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  ),
  Spacer: ({ height }) => (
    <div style={{ height: Math.min(400, Math.max(0, height)) }} />
  ),
  CTA: ({ title, label, url }) => (
    <section className="section cta">
      <h2>{title}</h2>
      <a className="pill dark" href={safeUrl(url)}>
        {label} ↗
      </a>
    </section>
  ),
};
