import { createContext, useContext } from "react";

export const AtelierContext = createContext(null);

export function useAtelier() {
  const context = useContext(AtelierContext);
  if (!context) throw new Error("O ambiente do ateliê não foi inicializado.");
  return context;
}
