import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { apiRouter } from "./api";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

  app.use(
    helmet({
      frameguard: { action: "deny" },
    }),
  );

  const configuredOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? configuredOrigins
      : [
          ...new Set([
            ...configuredOrigins,
            "http://localhost:5173",
            "http://localhost:3000",
          ]),
        ];

  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS"));
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/auth"),
  });

  // API ROUTES
  app.use("/api", apiRateLimiter, apiRouter);

  // FACEIT Abstraction Endpoint (legacy example route)
  app.get("/api/faceit/match/:matchId", async (req, res) => {
    try {
      const { matchId } = req.params;
      const faceitApiKey = process.env.FACEIT_API_KEY;

      if (!faceitApiKey) {
        return res
          .status(503)
          .json({ error: "FACEIT_API_KEY is not configured" });
      }

      res.json({
        matchId,
        status: "success",
        note: "Implement real FACEIT API call here",
      });
    } catch (error) {
      console.error("Error fetching FACEIT match:", error);
      res.status(500).json({ error: "Failed to fetch match data from FACEIT" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
