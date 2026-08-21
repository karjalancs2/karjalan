import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { apiRouter } from "./api";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // API ROUTES
  app.use("/api", apiRouter);
  
  // FACEIT Abstraction Endpoint (legacy example route)
  app.get("/api/faceit/match/:matchId", async (req, res) => {
    try {
      const { matchId } = req.params;
      const faceitApiKey = process.env.FACEIT_API_KEY;
      
      if (!faceitApiKey) {
        return res.status(503).json({ error: "FACEIT_API_KEY is not configured" });
      }

      res.json({ matchId, status: "success", note: "Implement real FACEIT API call here" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
