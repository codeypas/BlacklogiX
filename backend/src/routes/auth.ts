import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { env } from "../config/env.js";
import { query } from "../db.js";

const authRouter = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

type AnalystRecord = {
  id: string;
  name: string;
  email: string;
  organization: string;
  avatar_url: string | null;
  auth_provider: string;
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  organization: z.string().min(2),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

function issueSessionToken(analyst: AnalystRecord) {
  return jwt.sign(
    {
      sub: analyst.id,
      email: analyst.email,
      name: analyst.name,
      organization: analyst.organization,
      authProvider: analyst.auth_provider,
    },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function formatAnalyst(analyst: AnalystRecord) {
  return {
    id: analyst.id,
    name: analyst.name,
    email: analyst.email,
    organization: analyst.organization,
    avatarUrl: analyst.avatar_url,
    authProvider: analyst.auth_provider,
  };
}

function deriveOrganization(email: string) {
  const domain = email.split("@")[1] ?? "blocklogix.dev";
  const root = domain.split(".")[0] ?? "blocklogix";
  return root
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

authRouter.post("/register", async (request, response, next) => {
  try {
    const payload = registerSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const result = await query<AnalystRecord>(
      `
        insert into analysts (name, email, organization, password_hash, auth_provider)
        values ($1, $2, $3, $4, 'local')
        returning id, name, email, organization, avatar_url, auth_provider
      `,
      [payload.name, payload.email, payload.organization, passwordHash],
    );

    const analyst = result.rows[0];

    response.status(201).json({
      analyst: formatAnalyst(analyst),
      token: issueSessionToken(analyst),
      message: "Analyst account created",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const payload = loginSchema.parse(request.body);

    const result = await query<
      AnalystRecord & {
        password_hash: string | null;
      }
    >(
      `
        select id, name, email, organization, password_hash, avatar_url, auth_provider
        from analysts
        where email = $1
        limit 1
      `,
      [payload.email],
    );

    const analyst = result.rows[0];

    if (!analyst) {
      response.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (!analyst.password_hash) {
      response.status(401).json({ message: "Use Google Sign-In for this account" });
      return;
    }

    const passwordMatches = await bcrypt.compare(payload.password, analyst.password_hash);

    if (!passwordMatches) {
      response.status(401).json({ message: "Invalid email or password" });
      return;
    }

    response.json({
      analyst: formatAnalyst(analyst),
      token: issueSessionToken(analyst),
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/google", async (request, response, next) => {
  try {
    const payload = googleAuthSchema.parse(request.body);
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.credential,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();

    if (!googlePayload?.email || !googlePayload.sub) {
      response.status(401).json({ message: "Unable to verify Google account" });
      return;
    }

    if (!googlePayload.email_verified) {
      response.status(401).json({ message: "Google account email is not verified" });
      return;
    }

    const existingResult = await query<
      AnalystRecord & {
        google_sub: string | null;
      }
    >(
      `
        select id, name, email, organization, avatar_url, auth_provider, google_sub
        from analysts
        where google_sub = $1 or email = $2
        order by case when google_sub = $1 then 0 else 1 end
        limit 1
      `,
      [googlePayload.sub, googlePayload.email],
    );

    const existingAnalyst = existingResult.rows[0];
    const organization = existingAnalyst?.organization ?? deriveOrganization(googlePayload.email);
    const displayName = googlePayload.name ?? existingAnalyst?.name ?? googlePayload.email;
    const avatarUrl = googlePayload.picture ?? existingAnalyst?.avatar_url ?? null;

    let analyst: AnalystRecord;

    if (existingAnalyst) {
      const updatedResult = await query<AnalystRecord>(
        `
          update analysts
          set
            name = $2,
            email = $3,
            organization = $4,
            google_sub = $5,
            auth_provider = 'google',
            avatar_url = $6
          where id = $1
          returning id, name, email, organization, avatar_url, auth_provider
        `,
        [
          existingAnalyst.id,
          displayName,
          googlePayload.email,
          organization,
          googlePayload.sub,
          avatarUrl,
        ],
      );

      analyst = updatedResult.rows[0];
    } else {
      const insertedResult = await query<AnalystRecord>(
        `
          insert into analysts (
            name,
            email,
            organization,
            password_hash,
            google_sub,
            auth_provider,
            avatar_url
          )
          values ($1, $2, $3, null, $4, 'google', $5)
          returning id, name, email, organization, avatar_url, auth_provider
        `,
        [displayName, googlePayload.email, organization, googlePayload.sub, avatarUrl],
      );

      analyst = insertedResult.rows[0];
    }

    response.json({
      analyst: formatAnalyst(analyst),
      token: issueSessionToken(analyst),
      message: "Google login successful",
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
