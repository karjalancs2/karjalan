import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma";
import { authMiddleware } from "../auth";

export const discordRouter = Router();

const oauthStateCookie = "discord_oauth_state";
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/discord/callback",
  maxAge: 10 * 60 * 1000,
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function getDiscordRedirectUri() {
  const redirectUri = requiredEnv("DISCORD_REDIRECT_URI");
  const parsedUri = new URL(redirectUri);
  if (
    parsedUri.pathname !== "/api/discord/callback" ||
    parsedUri.search ||
    parsedUri.hash
  ) {
    throw new Error(
      "DISCORD_REDIRECT_URI must be the exact /api/discord/callback URL",
    );
  }
  if (process.env.NODE_ENV === "production" && parsedUri.protocol !== "https:") {
    throw new Error("DISCORD_REDIRECT_URI must use HTTPS in production");
  }
  return redirectUri;
}

function getJwtSecret() {
  const secret = requiredEnv("JWT_SECRET");
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return secret;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "https://karjalan.net").replace(/\/+$/, "");
}

function redirectToProfile(res: Response, userId: string, result: string) {
  const target = new URL(
    `/profile/${encodeURIComponent(userId)}`,
    getFrontendUrl(),
  );
  target.searchParams.set("discord", result);
  return res.redirect(target.toString());
}

function authUserId(req: Request) {
  return String((req as Request & { user?: { id?: string } }).user?.id || "");
}

discordRouter.get("/login", authMiddleware, async (req, res) => {
  const userId = authUserId(req);
  try {
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const jwtSecret = getJwtSecret();
    const clientId = requiredEnv("DISCORD_CLIENT_ID");
    const redirectUri = getDiscordRedirectUri();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { discordId: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.discordId) {
      return res.status(409).json({ error: "A Discord account is already linked" });
    }

    const state = jwt.sign(
      { userId, nonce: randomUUID() },
      jwtSecret,
      { expiresIn: "10m" },
    );
    res.cookie(oauthStateCookie, state, oauthStateCookieOptions);

    const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
      state,
    }).toString();
    console.info("[Discord OAuth] Using redirect_uri:", redirectUri);
    return res.redirect(authorizationUrl.toString());
  } catch (error) {
    console.error("Discord OAuth Init Error:", error);
    return res.status(500).json({ error: "Failed to start Discord linking" });
  }
});

discordRouter.get("/callback", async (req, res) => {
  res.clearCookie(oauthStateCookie, { path: oauthStateCookieOptions.path });

  let userId = "";
  try {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = req.cookies?.[oauthStateCookie];
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!state || !cookieState || state !== cookieState) {
      return res.redirect(`${getFrontendUrl()}/?discord=error`);
    }

    const decoded = jwt.verify(state, getJwtSecret());
    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      !decoded.userId
    ) {
      return res.redirect(`${getFrontendUrl()}/?discord=error`);
    }
    userId = decoded.userId;
    if (req.query.error || !code) {
      return redirectToProfile(res, userId, "error");
    }

    const clientId = requiredEnv("DISCORD_CLIENT_ID");
    const clientSecret = requiredEnv("DISCORD_CLIENT_SECRET");
    const redirectUri = getDiscordRedirectUri();
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(
        `Discord token exchange failed (${tokenResponse.status}): ${tokenData.error_description || tokenData.error || "No access token returned"}`,
      );
    }

    const identityResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const identity = (await identityResponse.json()) as {
      id?: string;
      username?: string;
    };
    if (!identityResponse.ok || !identity.id) {
      throw new Error(`Discord identity lookup failed (${identityResponse.status})`);
    }

    const existingLink = await prisma.user.findUnique({
      where: { discordId: identity.id },
      select: { id: true },
    });
    if (existingLink && existingLink.id !== userId) {
      throw new Error("This Discord account is already linked to another user");
    }

    const guildId = requiredEnv("DISCORD_GUILD_ID");
    const playerRoleId = requiredEnv("DISCORD_PLAYER_ROLE_ID");
    const botToken = requiredEnv("DISCORD_BOT_TOKEN");
    const memberUrl = `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(identity.id)}`;
    const addMemberResponse = await fetch(memberUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: tokenData.access_token,
        roles: [playerRoleId],
      }),
    });
    if (!addMemberResponse.ok) {
      throw new Error(
        `Discord guild join failed (${addMemberResponse.status}): ${await addMemberResponse.text()}`,
      );
    }

    const roleResponse = await fetch(
      `${memberUrl}/roles/${encodeURIComponent(playerRoleId)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${botToken}` },
      },
    );
    if (!roleResponse.ok) {
      throw new Error(
        `Discord Player role assignment failed (${roleResponse.status}): ${await roleResponse.text()}`,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { discordId: identity.id },
    });
    return redirectToProfile(res, userId, "linked");
  } catch (error) {
    console.error("Discord OAuth callback failed:", error);
    if (userId) return redirectToProfile(res, userId, "error");
    return res.redirect(`${getFrontendUrl()}/?discord=error`);
  }
});
