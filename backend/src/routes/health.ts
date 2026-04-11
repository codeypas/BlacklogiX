import { Router } from "express";

import { query } from "../db.js";

const healthRouter = Router();

healthRouter.get("/", async (_request, response, next) => {
  try {
    const databaseCheck = await query<{ now: string }>("select now()::text as now");

    response.json({
      ok: true,
      service: "blacklogix-backend",
      timestamp: databaseCheck.rows[0]?.now ?? new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default healthRouter;

