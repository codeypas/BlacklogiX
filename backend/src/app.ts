import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import { env } from "./config/env.js";
import authRouter from "./routes/auth.js";
import healthRouter from "./routes/health.js";
import logSourcesRouter from "./routes/log-sources.js";

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    service: "blacklogix-backend",
    status: "running",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/log-sources", logSourcesRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Invalid request payload",
      issues: error.flatten(),
    });
    return;
  }

  if (error instanceof Error) {
    response.status(500).json({
      message: error.message,
    });
    return;
  }

  response.status(500).json({
    message: "Unexpected server error",
  });
});

