"use client";

import { useEffect } from "react";
import { socket } from "./socket";

/** Opens the tab's socket while the logged-in admin is mounted (inside AuthGuard). */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    socket.start();
    return () => socket.stop();
  }, []);
  return <>{children}</>;
}
