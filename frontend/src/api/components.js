export async function libraryApi(path = "", method = "GET", body) {
  const r = await fetch("/api/components" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok)
    throw Error(
      typeof data.detail === "string"
        ? data.detail
        : "No se pudo guardar el componente",
    );
  return data;
}
export async function request(path = "", method = "GET", body) {
  const response = await fetch("/api/components" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(
      typeof result.detail === "string"
        ? result.detail
        : "No se pudo guardar la sección",
    );
  return result;
}
