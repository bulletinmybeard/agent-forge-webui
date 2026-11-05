import { useEffect, useState } from "react";
import ws from "../lib/ws";

export default function useWsConnected() {
  const [connected, setConnected] = useState(() => ws.isConnected());

  useEffect(() => {
    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);
    ws.on("connected", onConnected);
    ws.on("disconnected", onDisconnected);
    setConnected(ws.isConnected());
    return () => {
      ws.off("connected", onConnected);
      ws.off("disconnected", onDisconnected);
    };
  }, []);

  return connected;
}
