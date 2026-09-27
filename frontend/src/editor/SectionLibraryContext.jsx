import React, { createContext, useContext, useEffect, useState } from "react";
import { libraryApi } from "../api/components";
const Context = createContext(null);
export const useSectionLibrary = () => useContext(Context);
export function SectionLibraryProvider({ children }) {
  const [items, setItems] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = async () => setItems(await libraryApi());
  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, []);
  async function action(fn) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{ items, refresh, message, setMessage, busy, action }}
    >
      {children}
    </Context.Provider>
  );
}
