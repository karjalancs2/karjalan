import { Router } from "express";
import { prisma } from "../database/prisma";
import { authRouter, authMiddleware } from "../auth";
import { faceitService } from "../integrations/faceit/faceitService";

export const apiRouter = Router();

async function refreshFaceitStatsIfMissing(user: any) {
  const profile = user.faceitProfile;
  const hasStats =
    (profile?.level ?? user.faceitLevel) != null &&
    (profile?.elo ?? user.faceitElo) != null &&
    (profile?.avatar || user.faceitAvatar);
  if (hasStats || !user.faceitUsername) return;

  try {
    const refreshed = await faceitService.getPlayerProfile(user.faceitUsername);
    if (!refreshed.playerId) return;

    await prisma.faceitProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        playerId: refreshed.playerId,
        username: refreshed.nickname,
        avatar: refreshed.avatar,
        elo: refreshed.elo == null ? null : Math.floor(refreshed.elo),
        level: refreshed.level == null ? null : Number(refreshed.level),
        profileUrl: refreshed.profileUrl || null,
      },
      update: {
        playerId: refreshed.playerId,
        username: refreshed.nickname,
        avatar: refreshed.avatar,
        elo: refreshed.elo == null ? null : Math.floor(refreshed.elo),
        level: refreshed.level == null ? null : Number(refreshed.level),
        profileUrl: refreshed.profileUrl || null,
      },
    });
    const userStats = {
      faceitId: refreshed.playerId,
      faceitUsername: refreshed.nickname,
      faceitAvatar: refreshed.avatar,
      faceitElo: refreshed.elo == null ? null : Math.floor(refreshed.elo),
      faceitLevel: refreshed.level == null ? null : Number(refreshed.level),
      faceitVerifiedAt: new Date(),
    };
    await prisma.user.update({
      where: { id: user.id },
      data: userStats,
    });
    Object.assign(user, userStats);
    if (user.faceitProfile)
      Object.assign(user.faceitProfile, {
        avatar: refreshed.avatar,
        elo: userStats.faceitElo,
        level: userStats.faceitLevel,
        username: refreshed.nickname,
      });
  } catch (error) {
    console.error("Failed to refresh FACEIT stats:", error);
  }
}

async function refreshFaceitStatsForUsers(users: any[]) {
  await Promise.all(users.map((user) => refreshFaceitStatsIfMissing(user)));
}

async function isAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

function isLobbyMember(
  lobby: {
    captainId: string;
    members?: Array<{ userId: string; status: string }>;
  },
  userId: string,
) {
  return (
    lobby.captainId === userId ||
    Boolean(
      lobby.members?.some(
        (member) => member.userId === userId && member.status === "active",
      ),
    )
  );
}

apiRouter.use("/auth", authRouter);

apiRouter.get("/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { faceitProfile: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    await refreshFaceitStatsIfMissing(user);
    return res.json({ user });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Link and verify FACEIT profile for authenticated user
apiRouter.post("/auth/faceit/link", authMiddleware, async (req, res) => {
  const { faceitUrl } = req.body;
  const userId = (req as any).user.id;

  if (!faceitUrl) return res.status(400).json({ error: "FACEIT URL required" });

  try {
    const profile = await faceitService.getPlayerProfile(faceitUrl);
    if (!profile || !profile.playerId)
      return res
        .status(400)
        .json({ error: "FACEIT profile could not be verified" });

    // Upsert FaceitProfile record and update user fields for compatibility
    const faceitRecord = await prisma.faceitProfile.upsert({
      where: { userId },
      create: {
        userId,
        playerId: profile.playerId,
        username: profile.nickname,
        avatar: profile.avatar,
        elo: profile.elo ? Math.floor(profile.elo) : null,
        level: profile.level ? Number(profile.level) : null,
        profileUrl: profile.profileUrl || null,
      },
      update: {
        playerId: profile.playerId,
        username: profile.nickname,
        avatar: profile.avatar,
        elo: profile.elo ? Math.floor(profile.elo) : null,
        level: profile.level ? Number(profile.level) : null,
        profileUrl: profile.profileUrl || null,
      },
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        faceitId: profile.playerId,
        faceitUsername: profile.nickname,
        faceitAvatar: profile.avatar,
        faceitElo: profile.elo ? Math.floor(profile.elo) : null,
        faceitLevel: profile.level ? Number(profile.level) : null,
        faceitVerifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      profile: {
        playerId: profile.playerId,
        nickname: profile.nickname,
        avatar: profile.avatar,
        elo: profile.elo,
        level: profile.level,
      },
    });
  } catch (err: any) {
    console.error("Failed to link FACEIT profile:", err);
    res.status(500).json({ error: "Failed to verify FACEIT profile" });
  }
});

// GET all tournaments
apiRouter.get("/tournaments", async (req, res) => {
  const tournaments = await prisma.tournament.findMany();
  res.json(tournaments);
});

// GET tournament by ID
apiRouter.get("/tournaments/:id", async (req, res) => {
  const { id } = req.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  res.json(tournament || null);
});

// GET matches by tournament
apiRouter.get("/tournaments/:id/matches", async (req, res) => {
  const { id } = req.params;
  const matches = await prisma.match.findMany({ where: { tournamentId: id } });
  res.json(matches);
});

// GET lobbies
apiRouter.get("/lobbies", async (req, res) => {
  const lobbies = await prisma.lobby.findMany({
    include: {
      // Include members (authoritative), slots, and the related user for each occupied slot
      members: {
        orderBy: { slotIndex: "asc" },
        include: { user: true, faceitProfile: true },
      },
      slots: {
        orderBy: { slotIndex: "asc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              faceitId: true,
              faceitUsername: true,
              faceitAvatar: true,
              faceitElo: true,
              faceitLevel: true,
              faceitVerifiedAt: true,
              role: true,
              country: true,
              inGameRole: true,
            },
          },
        },
      },
      // Include captain basic info
      captain: {
        select: {
          id: true,
          username: true,
          email: true,
          faceitId: true,
          faceitUsername: true,
          faceitAvatar: true,
          faceitElo: true,
          faceitLevel: true,
        },
      },
    },
  });
  await refreshFaceitStatsForUsers([
    ...lobbies.flatMap((lobby) => lobby.members.map((member) => member.user)),
    ...lobbies.flatMap((lobby) =>
      lobby.slots.flatMap((slot) => (slot.user ? [slot.user] : [])),
    ),
  ]);
  res.json(lobbies);
});

// GET single lobby by id
apiRouter.get("/lobbies/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { slotIndex: "asc" },
          include: { user: true, faceitProfile: true },
        },
        slots: {
          orderBy: { slotIndex: "asc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                faceitId: true,
                faceitUsername: true,
                faceitAvatar: true,
                faceitElo: true,
                faceitLevel: true,
                faceitVerifiedAt: true,
                role: true,
                country: true,
                inGameRole: true,
              },
            },
          },
        },
        captain: {
          select: {
            id: true,
            username: true,
            email: true,
            faceitId: true,
            faceitUsername: true,
            faceitAvatar: true,
            faceitElo: true,
            faceitLevel: true,
          },
        },
        requests: { include: { user: true } },
      },
    });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    await refreshFaceitStatsForUsers([
      ...lobby.members.map((member) => member.user),
      ...lobby.slots.flatMap((slot) => (slot.user ? [slot.user] : [])),
    ]);
    res.json(lobby);
  } catch (err) {
    console.error("Failed to fetch lobby:", err);
    res.status(500).json({ error: "Failed to fetch lobby" });
  }
});

// CREATE lobby (Authenticated) — require FACEIT profile verification first
apiRouter.post("/lobbies", authMiddleware, async (req, res) => {
  const { tournamentId, name, description, faceitUrl } = req.body;
  const userId = (req as any).user.id;

  try {
    // Load user to check if they already have a FACEIT profile
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // If user has no verified faceitId, require faceitUrl and verify it
    if (!user.faceitId) {
      if (!faceitUrl)
        return res.status(400).json({ error: "FACEIT profile required" });

      // Verify via faceitService
      const profile = await faceitService.getPlayerProfile(faceitUrl);
      if (!profile || !profile.playerId)
        return res
          .status(400)
          .json({ error: "FACEIT profile could not be verified" });

      // Update user with verified FACEIT info
      await prisma.user.update({
        where: { id: userId },
        data: {
          faceitId: profile.playerId,
          faceitUsername: profile.nickname,
          faceitAvatar: profile.avatar,
          faceitElo: profile.elo ? Math.floor(profile.elo) : null,
          faceitLevel: profile.level ? Number(profile.level) : null,
          faceitVerifiedAt: new Date(),
          role: "TEAM_CAPTAIN",
        },
      });
    } else {
      // ensure user has captain role set
      if (user.role !== "TEAM_CAPTAIN") {
        await prisma.user.update({
          where: { id: userId },
          data: { role: "TEAM_CAPTAIN" },
        });
      }
    }

    // Create lobby, slots and creator member transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Ensure FaceitProfile exists for creator (use existing or create from user fields)
      let faceitRecord = await tx.faceitProfile.findUnique({
        where: { userId },
      });
      if (!faceitRecord) {
        if (user.faceitId) {
          faceitRecord = await tx.faceitProfile.create({
            data: {
              userId,
              playerId: user.faceitId,
              username: user.faceitUsername || user.username,
              avatar: user.faceitAvatar || null,
              elo: user.faceitElo || null,
              level: user.faceitLevel || null,
              profileUrl: null,
            },
          });
        }
      }

      const lobby = await tx.lobby.create({
        data: {
          tournamentId,
          name,
          captainId: userId,
          description,
        },
      });

      const slotsData = [
        { userId: userId, status: "occupied", slotIndex: 0 },
        { status: "empty", slotIndex: 1 },
        { status: "empty", slotIndex: 2 },
        { status: "empty", slotIndex: 3 },
        { status: "empty", slotIndex: 4 },
      ];

      for (const s of slotsData) {
        await tx.lobbySlot.create({ data: { ...s, lobbyId: lobby.id } });
      }

      // Create the LobbyMember record for the captain occupying slot 0
      await tx.lobbyMember.create({
        data: {
          lobbyId: lobby.id,
          userId,
          faceitProfileId: faceitRecord ? faceitRecord.id : null,
          slotIndex: 0,
          role: "CAPTAIN",
          status: "active",
        },
      });

      // Ensure user role is captain
      await tx.user.update({
        where: { id: userId },
        data: { role: "TEAM_CAPTAIN" },
      });

      return lobby;
    });

    res.json({ id: result.id });
  } catch (error: any) {
    console.error("Failed to create lobby:", error);
    res.status(500).json({ error: "Failed to create lobby" });
  }
});

// DELETE lobby (Authenticated) — only captain or admin can remove
apiRouter.delete("/lobbies/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {
    const lobby = await prisma.lobby.findUnique({ where: { id } });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    if (lobby.captainId !== userId && !(await isAdmin(userId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Transactionally remove related data and the lobby
    await prisma.$transaction(async (tx) => {
      await tx.lobbySlot.deleteMany({ where: { lobbyId: id } });
      await tx.lobbyMember.deleteMany({ where: { lobbyId: id } });
      await tx.lobbyRequest.deleteMany({ where: { lobbyId: id } });
      await tx.lobbyChatMessage.deleteMany({ where: { lobbyId: id } });
      await tx.notification.deleteMany({ where: { lobbyId: id } });
      await tx.lobby.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lobby:", error);
    res.status(500).json({ error: "Failed to delete lobby" });
  }
});

// JOIN lobby slot (Authenticated)
apiRouter.post("/lobbies/:id/join", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { slotId } = req.body;
  const userId = (req as any).user.id;

  try {
    // Check if slot is empty
    const slot = await prisma.lobbySlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.lobbyId !== id || slot.status !== "empty") {
      return res.status(400).json({ error: "Slot not available" });
    }

    await prisma.lobbySlot.update({
      where: { id: slotId },
      data: { userId, status: "occupied" },
    });

    // Check if lobby is now full
    const allSlots = await prisma.lobbySlot.findMany({
      where: { lobbyId: id },
    });
    if (allSlots.every((s) => s.status === "occupied")) {
      await prisma.lobby.update({ where: { id }, data: { status: "ready" } });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// CREATE a join request (Authenticated) — players request to join, captain reviews
apiRouter.post("/lobbies/:id/requests", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { message, slotId } = req.body;
  const userId = (req as any).user.id;

  try {
    // Simple validation
    const lobby = await prisma.lobby.findUnique({ where: { id } });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    const existing = await prisma.lobbyRequest.findMany({
      where: { lobbyId: id, userId },
    });
    if (existing.length > 0)
      return res.status(400).json({ error: "Request already submitted" });

    const reqRec = await prisma.lobbyRequest.create({
      data: {
        lobbyId: id,
        userId,
        slotId: slotId || null,
        message: message || null,
      },
    });

    // Create a notification for the captain
    try {
      const lobbyCaptain = await prisma.lobby.findUnique({
        where: { id },
        select: { captainId: true, name: true },
      });
      if (lobbyCaptain && lobbyCaptain.captainId) {
        await prisma.notification.create({
          data: {
            recipientId: lobbyCaptain.captainId,
            type: "join_request",
            title: "Uusi liittymispyyntö",
            message: `${(req as any).user.username || "A player"} haluaa liittyä joukkueeseesi.`,
            lobbyId: id,
            joinRequestId: reqRec.id,
          },
        });
      }

      // Confirmation notification for requester
      await prisma.notification.create({
        data: {
          recipientId: userId,
          type: "join_request_received",
          title: "Liittymispyyntö lähetetty",
          message: "Liittymispyyntösi on lähetetty joukkueen kapteenille.",
          lobbyId: id,
          joinRequestId: reqRec.id,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    res.json(reqRec);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// GET requests for a lobby (Authenticated) — only captain should retrieve
apiRouter.get("/lobbies/:id/requests", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {
    const lobby = await prisma.lobby.findUnique({ where: { id } });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    if (lobby.captainId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    const requests = await prisma.lobbyRequest.findMany({
      where: { lobbyId: id, status: "pending" },
      include: { user: true },
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ACCEPT a request (Authenticated, captain only)
apiRouter.post(
  "/lobbies/:lobbyId/requests/:reqId/accept",
  authMiddleware,
  async (req, res) => {
    const { lobbyId, reqId } = req.params;
    const userId = (req as any).user.id;

    try {
      const lobby = await prisma.lobby.findUnique({
        where: { id: lobbyId },
        include: { slots: true },
      });
      if (!lobby) return res.status(404).json({ error: "Lobby not found" });
      if (lobby.captainId !== userId)
        return res.status(403).json({ error: "Forbidden" });

      const request = await prisma.lobbyRequest.findUnique({
        where: { id: reqId },
      });
      if (!request || request.lobbyId !== lobbyId)
        return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending")
        return res.status(400).json({ error: "Request already handled" });

      // Transactionally accept request, occupy slot and create LobbyMember
      const result = await prisma.$transaction(async (tx) => {
        // Find slot to occupy
        let slot = null as any;
        if (request.slotId) {
          slot = await tx.lobbySlot.findUnique({
            where: { id: request.slotId },
          });
          if (!slot || slot.status !== "empty") slot = null;
        }
        if (!slot) {
          slot = await tx.lobbySlot.findFirst({
            where: { lobbyId, status: "empty" },
            orderBy: { slotIndex: "asc" },
          });
        }
        if (!slot) throw new Error("No empty slots");

        // Update slot to occupied
        await tx.lobbySlot.update({
          where: { id: slot.id },
          data: { userId: request.userId, status: "occupied" },
        });

        // Ensure faceit profile exists for the accepted user
        let faceitRecord = await tx.faceitProfile.findUnique({
          where: { userId: request.userId },
        });
        if (!faceitRecord) {
          // attempt to use user stored faceit fields
          const reqUser = await tx.user.findUnique({
            where: { id: request.userId },
          });
          if (reqUser?.faceitId) {
            faceitRecord = await tx.faceitProfile.create({
              data: {
                userId: request.userId,
                playerId: reqUser.faceitId,
                username: reqUser.faceitUsername || reqUser.username,
                avatar: reqUser.faceitAvatar || null,
                elo: reqUser.faceitElo || null,
                level: reqUser.faceitLevel || null,
                profileUrl: null,
              },
            });
          }
        }

        // Create LobbyMember record
        await tx.lobbyMember.create({
          data: {
            lobbyId,
            userId: request.userId,
            faceitProfileId: faceitRecord ? faceitRecord.id : null,
            slotIndex: slot.slotIndex,
            role: "MEMBER",
            status: "active",
          },
        });

        // Update request status
        await tx.lobbyRequest.update({
          where: { id: reqId },
          data: { status: "accepted" },
        });

        // Check if now full and update lobby status
        const allSlots = await tx.lobbySlot.findMany({ where: { lobbyId } });
        if (allSlots.every((s) => s.status === "occupied")) {
          await tx.lobby.update({
            where: { id: lobbyId },
            data: { status: "ready" },
          });
        }

        return { slotIndex: slot.slotIndex };
      });

      // Create notification for the accepted player
      try {
        await prisma.notification.create({
          data: {
            recipientId: request.userId,
            type: "request_accepted",
            title: "Hyväksytty joukkueeseen",
            message: `Sinut hyväksyttiin joukkueeseen ${lobby.name}.`,
            lobbyId: lobbyId,
            joinRequestId: reqId,
          },
        });
      } catch (notifErr) {
        console.error("Failed to create accept notification:", notifErr);
      }

      // If full, notify captain about full team
      try {
        const allSlots = await prisma.lobbySlot.findMany({
          where: { lobbyId },
        });
        if (allSlots.every((s) => s.status === "occupied")) {
          await prisma.notification.create({
            data: {
              recipientId: lobby.captainId,
              type: "team_full",
              title: "Joukkue täynnä",
              message: `Joukkue ${lobby.name} on nyt täynnä.`,
              lobbyId,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to create team full notification:", notifErr);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      if (error.message === "No empty slots")
        return res.status(400).json({ error: "No empty slots" });
      res.status(500).json({ error: "Failed to accept request" });
    }
  },
);

// REJECT a request (Authenticated, captain only)
apiRouter.post(
  "/lobbies/:lobbyId/requests/:reqId/reject",
  authMiddleware,
  async (req, res) => {
    const { lobbyId, reqId } = req.params;
    const userId = (req as any).user.id;

    try {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
      if (!lobby) return res.status(404).json({ error: "Lobby not found" });
      if (lobby.captainId !== userId)
        return res.status(403).json({ error: "Forbidden" });

      const request = await prisma.lobbyRequest.findUnique({
        where: { id: reqId },
      });
      if (!request || request.lobbyId !== lobbyId)
        return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending")
        return res.status(400).json({ error: "Request already handled" });

      await prisma.lobbyRequest.update({
        where: { id: reqId },
        data: { status: "rejected" },
      });

      try {
        await prisma.notification.create({
          data: {
            recipientId: request.userId,
            type: "request_rejected",
            title: "Liittymispyyntö hylätty",
            message: `Liittymispyyntösi joukkueeseen ${lobby.name} hylättiin.`,
            lobbyId: lobbyId,
            joinRequestId: reqId,
          },
        });
      } catch (notifErr) {
        console.error("Failed to create reject notification:", notifErr);
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to reject request" });
    }
  },
);

// Chat: get messages
apiRouter.get(
  "/lobbies/:id/chat/messages",
  authMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    try {
      const lobby = await prisma.lobby.findUnique({
        where: { id },
        include: { members: { select: { userId: true, status: true } } },
      });
      if (!lobby) return res.status(404).json({ error: "Lobby not found" });
      if (!isLobbyMember(lobby, userId) && !(await isAdmin(userId))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const messages = await prisma.lobbyChatMessage.findMany({
        where: { lobbyId: id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true } } },
      });
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  },
);

// Chat: post message
apiRouter.post(
  "/lobbies/:id/chat/messages",
  authMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    try {
      // Verify membership (captain or accepted member), or admin access.
      const lobby = await prisma.lobby.findUnique({
        where: { id },
        include: { members: { select: { userId: true, status: true } } },
      });
      if (!lobby) return res.status(404).json({ error: "Lobby not found" });

      if (!isLobbyMember(lobby, userId) && !(await isAdmin(userId)))
        return res
          .status(403)
          .json({ error: "Forbidden" });

      const msg = await prisma.lobbyChatMessage.create({
        data: { lobbyId: id, userId, content },
      });

      // Notify all other members about the new message
      try {
        const lobbyWithSlots = await prisma.lobby.findUnique({
          where: { id },
          include: { slots: true },
        });
        if (lobbyWithSlots) {
          const memberIds = new Set<string>();
          memberIds.add(lobbyWithSlots.captainId);
          for (const s of lobbyWithSlots.slots)
            if (s.userId) memberIds.add(s.userId);
          for (const memberId of memberIds) {
            if (memberId === userId) continue; // don't notify sender
            await prisma.notification.create({
              data: {
                recipientId: memberId,
                type: "chat_message",
                title: "Uusi tiimiviesti",
                message: `Uusi viesti joukkueessa ${lobbyWithSlots.name}.`,
                lobbyId: id,
              },
            });
          }
        }
      } catch (notifErr) {
        console.error("Failed to create chat notifications:", notifErr);
      }

      res.json({ success: true, message: msg });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to post message" });
    }
  },
);

// NOTIFICATIONS: get list for current user
apiRouter.get("/notifications", authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const notes = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark single notification as read
apiRouter.post("/notifications/:id/read", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  try {
    const note = await prisma.notification.findUnique({ where: { id } });
    if (!note || note.recipientId !== userId)
      return res.status(404).json({ error: "Notification not found" });
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to mark notification read:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all notifications read
apiRouter.post(
  "/notifications/mark-all-read",
  authMiddleware,
  async (req, res) => {
    const userId = (req as any).user.id;
    try {
      await prisma.notification.updateMany({
        where: { recipientId: userId, isRead: false },
        data: { isRead: true },
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  },
);

// GET rankings
apiRouter.get("/rankings/teams", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { rankingPoints: "desc" },
      take: 100,
    });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rankings" });
  }
});

// CREATE team (Authenticated) — require a linked FACEIT profile first
apiRouter.get("/teams/:id", async (req, res) => {
  try {
    const team: any = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
          },
        },
        members: {
          orderBy: { slotNumber: "asc" },
          include: {
            faceitProfile: true,
            user: {
              select: {
                id: true,
                username: true,
                faceitLevel: true,
                faceitElo: true,
                faceitAvatar: true,
                faceitUsername: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Joukkuetta ei löytynyt." });
    }

    await refreshFaceitStatsForUsers(team.members.map((member) => member.user));

    return res.json({ team });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return res.status(500).json({
      error: "Joukkueen tietojen haku epäonnistui.",
    });
  }
});

apiRouter.delete("/teams/:id", authMiddleware, async (req, res) => {
  const teamId = req.params.id;
  const userId = (req as any).user.id;

  try {
    if (!(await isAdmin(userId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: "Team not found" });

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({ where: { teamId } });
      await tx.joinRequest.deleteMany({ where: { teamId } });
      await tx.team.delete({ where: { id: teamId } });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return res.status(500).json({ error: "Failed to delete team" });
  }
});

apiRouter.post("/teams", authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name) {
    return res.status(400).json({ error: "Joukkueen nimi vaaditaan." });
  }

  try {
    const faceitProfile = await prisma.faceitProfile.findUnique({
      where: { userId },
    });

    if (!faceitProfile) {
      return res.status(400).json({
        error: "Liitä FACEIT-profiilisi ennen joukkueen luomista.",
      });
    }

    const team = await prisma.$transaction(async (tx) => {
      return tx.team.create({
        data: {
          name,
          captainId: userId,
          members: {
            create: {
              userId,
              faceitProfileId: faceitProfile.id,
              slotNumber: 1,
              role: "CAPTAIN",
              status: "ACTIVE",
            },
          },
        },
        include: {
          captain: {
            select: {
              id: true,
              username: true,
              email: true,
              faceitProfile: true,
            },
          },
          members: {
            where: { slotNumber: 1 },
            include: {
              user: true,
              faceitProfile: true,
            },
          },
        },
      });
    });

    return res.status(201).json({ team });
  } catch (error: any) {
    console.error("Failed to create team:", error);

    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "Samanniminen joukkue on jo olemassa.",
      });
    }

    return res.status(500).json({
      error: "Joukkueen luominen epäonnistui. Yritä uudelleen.",
    });
  }
});

// GET teams looking for players
apiRouter.get("/teams", async (_req, res) => {
  try {
    const teams: any[] = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            faceitProfile: true,
          },
        },
        members: {
          where: { status: "ACTIVE" },
          orderBy: { slotNumber: "asc" },
          include: {
            faceitProfile: true,
            user: {
              select: {
                id: true,
                username: true,
                faceitLevel: true,
                faceitElo: true,
                faceitAvatar: true,
                faceitUsername: true,
              },
            },
          },
        },
      },
    });

    return res.json(teams.filter((team) => team.members.length < 5));
  } catch (error) {
    console.error("Failed to fetch teams looking for players:", error);
    return res.status(500).json({
      error: "Joukkueiden haku epäonnistui.",
    });
  }
});

// CREATE a team join request (Authenticated)
apiRouter.post("/teams/:id/join-requests", authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const teamId = req.params.id;

  try {
    const faceitProfile = await prisma.faceitProfile.findUnique({
      where: { userId },
    });

    if (!faceitProfile) {
      return res.status(400).json({ error: "Liitä FACEIT-profiilisi ensin." });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });

    if (!team) {
      return res.status(404).json({ error: "Joukkuetta ei löytynyt." });
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: { teamId: true },
    });

    if (existingMembership) {
      return res.status(400).json({ error: "Olet jo tämän joukkueen jäsen." });
    }

    const activeMemberCount = await prisma.teamMember.count({
      where: { teamId, status: "ACTIVE" },
    });

    if (activeMemberCount >= 5) {
      return res.status(400).json({ error: "Joukkue on täynnä." });
    }

    const pendingRequest = await prisma.joinRequest.findFirst({
      where: { teamId, userId, status: "PENDING" },
      select: { id: true },
    });

    if (pendingRequest) {
      return res
        .status(400)
        .json({ error: "Liittymispyyntösi on jo lähetetty." });
    }

    const joinRequest = await prisma.joinRequest.create({
      data: { teamId, userId, status: "PENDING" },
    });

    return res.status(201).json({ joinRequest });
  } catch (error: any) {
    console.error("Failed to create team join request:", error);

    if (error?.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Liittymispyyntösi on jo lähetetty." });
    }

    return res.status(500).json({
      error: "Liittymispyynnön lähettäminen epäonnistui.",
    });
  }
});

// GET pending team join requests (Authenticated, captain only)
apiRouter.get("/teams/:id/join-requests", authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const teamId = req.params.id;

  try {
    const captainMembership = await prisma.teamMember.findFirst({
      where: { teamId, userId, role: "CAPTAIN", status: "ACTIVE" },
      select: { teamId: true },
    });

    if (!captainMembership) {
      return res
        .status(403)
        .json({ error: "Vain joukkueen kapteeni voi nähdä pyynnöt." });
    }

    const requests = await prisma.joinRequest.findMany({
      where: { teamId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            faceitProfile: true,
          },
        },
      },
    });

    return res.json({ requests });
  } catch (error) {
    console.error("Failed to fetch team join requests:", error);
    return res.status(500).json({
      error: "Liittymispyyntöjen haku epäonnistui.",
    });
  }
});

// ACCEPT a team join request (Authenticated, captain only)
apiRouter.post(
  "/teams/:id/join-requests/:requestId/accept",
  authMiddleware,
  async (req, res) => {
    const userId = (req as any).user.id;
    const teamId = req.params.id;
    const requestId = req.params.requestId;

    try {
      const captainMembership = await prisma.teamMember.findFirst({
        where: { teamId, userId, role: "CAPTAIN", status: "ACTIVE" },
        select: { teamId: true },
      });

      if (!captainMembership) {
        return res
          .status(403)
          .json({ error: "Vain joukkueen kapteeni voi hyväksyä pyyntöjä." });
      }

      const result = await prisma.$transaction(async (tx) => {
        const request = await tx.joinRequest.findUnique({
          where: { id: requestId },
          include: { user: { include: { faceitProfile: true } } },
        });

        if (!request || request.teamId !== teamId) {
          throw new Error("JOIN_REQUEST_NOT_FOUND");
        }

        if (request.status !== "PENDING") {
          throw new Error("JOIN_REQUEST_NOT_PENDING");
        }

        if (!request.user.faceitProfile) {
          throw new Error("FACEIT_PROFILE_NOT_FOUND");
        }

        const activeMembers = await tx.teamMember.findMany({
          where: { teamId, status: "ACTIVE" },
          select: { slotNumber: true },
        });

        if (activeMembers.length >= 5) {
          throw new Error("TEAM_FULL");
        }

        const occupiedSlots = new Set(
          activeMembers.map((member) => member.slotNumber),
        );
        const slotNumber = [1, 2, 3, 4, 5].find(
          (slot) => !occupiedSlots.has(slot),
        );

        if (!slotNumber) {
          throw new Error("TEAM_FULL");
        }

        const member = await tx.teamMember.create({
          data: {
            teamId,
            userId: request.userId,
            faceitProfileId: request.user.faceitProfile.id,
            slotNumber,
            role: "PLAYER",
            status: "ACTIVE",
          },
          include: { user: true, faceitProfile: true },
        });

        await tx.joinRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED" },
        });

        return member;
      });

      return res.json({ member: result });
    } catch (error: any) {
      console.error("Failed to accept team join request:", error);

      const errors: Record<string, { status: number; message: string }> = {
        JOIN_REQUEST_NOT_FOUND: {
          status: 404,
          message: "Liittymispyyntöä ei löytynyt.",
        },
        JOIN_REQUEST_NOT_PENDING: {
          status: 400,
          message: "Liittymispyyntö on jo käsitelty.",
        },
        FACEIT_PROFILE_NOT_FOUND: {
          status: 400,
          message: "Hakijalla ei ole liitettyä FACEIT-profiilia.",
        },
        TEAM_FULL: { status: 400, message: "Joukkue on täynnä." },
      };
      const knownError = errors[error?.message];

      if (knownError) {
        return res
          .status(knownError.status)
          .json({ error: knownError.message });
      }

      if (error?.code === "P2002") {
        return res
          .status(400)
          .json({ error: "Pelaaja on jo joukkueen jäsen." });
      }

      return res.status(500).json({
        error: "Liittymispyynnön hyväksyminen epäonnistui.",
      });
    }
  },
);

// ADMIN: Connect FACEIT
apiRouter.post(
  "/admin/tournaments/:id/connect-faceit",
  authMiddleware,
  async (req, res) => {
    // In a real app, verify admin role here
    const { id } = req.params;
    const { faceitUrl } = req.body;

    try {
      const result = await faceitService.connectTournament(id, faceitUrl);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Webhook endpoint
apiRouter.post("/webhooks/faceit", async (req, res) => {
  try {
    await faceitService.processWebhook(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
