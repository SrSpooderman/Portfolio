import createClient from "openapi-fetch";
const client = createClient({ baseUrl: "", credentials: "same-origin" });
export async function api(path, method = "GET", body) {
  const { data, error, response } = await client[method](path, { body });
  if (!response.ok)
    throw new Error(
      typeof error?.detail === "string"
        ? error.detail
        : "No se ha podido completar la operación",
    );
  return data;
}
