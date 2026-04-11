import { app } from "./app.js";
import { env } from "./config/env.js";

const preferredPort = env.PORT;
const fallbackPorts = env.NODE_ENV === "development" ? [preferredPort, preferredPort + 1, preferredPort + 2] : [preferredPort];

function startServer(portIndex = 0) {
  const port = fallbackPorts[portIndex];
  const server = app.listen(port, () => {
    console.log(`BlackLogix backend listening on http://localhost:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && portIndex < fallbackPorts.length - 1) {
      const nextPort = fallbackPorts[portIndex + 1];
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      startServer(portIndex + 1);
      return;
    }

    throw error;
  });
}

startServer();
