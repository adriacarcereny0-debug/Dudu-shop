"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Origen del sitio (https://tudominio.com) en el navegador; vacío durante el render en servidor. */
export function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}
