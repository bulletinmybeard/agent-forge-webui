import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function hardenProxy(proxy) {
  const IGNORED = new Set(["EPIPE", "ECONNRESET", "ECONNREFUSED"]);

  function safeDestroy(s) {
    if (s && !s.destroyed && typeof s.destroy === "function") {
      try {
        s.destroy();
      } catch {
        /* already gone */
      }
    }
  }

  function hardenSocket(socket) {
    if (socket._hardened) return; // idempotent
    socket._hardened = true;
    const _origEmit = socket.emit;
    socket.emit = function (event, ...args) {
      if (event === "error") {
        const err = args[0];
        if (err && IGNORED.has(err.code)) {
          safeDestroy(socket);
          return true; // swallowed (no listeners fire)
        }
      }
      return _origEmit.apply(this, [event, ...args]);
    };
  }

  const _origProxyEmit = proxy.emit;
  proxy.emit = function (event, ...args) {
    if (event === "error") {
      const err = args[0];
      if (err && IGNORED.has(err.code)) {
        safeDestroy(args[2]); // (err, req, resOrSocket)
        return true;
      }
    }
    return _origProxyEmit.apply(this, [event, ...args]);
  };

  const _origOn = proxy.on.bind(proxy);
  proxy.on = (event, handler) => {
    if (event === "proxyReqWs") {
      return _origOn(event, function (proxyReq, req, socket, ...rest) {
        hardenSocket(socket);
        handler.call(this, proxyReq, req, socket, ...rest);
      });
    }
    if (event === "open") {
      return _origOn(event, function (proxySocket, ...rest) {
        hardenSocket(proxySocket);
        handler.call(this, proxySocket, ...rest);
      });
    }
    return _origOn(event, handler);
  };
}

const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:8200";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, // macOS sandbox prevents unlinking old dist files
  },
  server: {
    port: 5173,
    watch: { usePolling: true, interval: 300 },
    proxy: {
      "/ws": {
        target: backendUrl,
        ws: true,
        changeOrigin: true,
        configure: hardenProxy,
      },
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        configure: hardenProxy,
      },
      "/uploads": {
        target: backendUrl,
        changeOrigin: true,
        configure: hardenProxy,
      },
    },
  },
});
