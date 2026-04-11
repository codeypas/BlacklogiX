import { Router } from "express";
import { z } from "zod";

import { query } from "../db.js";

const logSourcesRouter = Router();

const logSourceSchema = z.object({
  name: z.string().min(2),
  sourceType: z.enum(["server", "cloud_audit_trail"]),
  host: z.string().optional(),
  port: z.string().optional(),
  provider: z.string().optional(),
  account: z.string().optional(),
  credentialLabel: z.string().min(2),
  status: z.enum(["connected", "ready", "paused"]).default("ready"),
});

logSourcesRouter.get("/", async (_request, response, next) => {
  try {
    const result = await query<{
      id: string;
      name: string;
      source_type: string;
      host: string | null;
      port: string | null;
      provider: string | null;
      account: string | null;
      credential_label: string;
      status: string;
      created_at: string;
    }>(
      `
        select
          id,
          name,
          source_type,
          host,
          port,
          provider,
          account,
          credential_label,
          status,
          created_at::text
        from log_sources
        order by created_at desc
      `,
    );

    response.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

logSourcesRouter.post("/", async (request, response, next) => {
  try {
    const payload = logSourceSchema.parse(request.body);

    const result = await query<{
      id: string;
      name: string;
      source_type: string;
      status: string;
    }>(
      `
        insert into log_sources (
          name,
          source_type,
          host,
          port,
          provider,
          account,
          credential_label,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id, name, source_type, status
      `,
      [
        payload.name,
        payload.sourceType,
        payload.host ?? null,
        payload.port ?? null,
        payload.provider ?? null,
        payload.account ?? null,
        payload.credentialLabel,
        payload.status,
      ],
    );

    response.status(201).json({
      item: result.rows[0],
      message: "Log source saved",
    });
  } catch (error) {
    next(error);
  }
});

export default logSourcesRouter;

