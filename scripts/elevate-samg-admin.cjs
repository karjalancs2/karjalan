const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { username: "SamG" },
    data: { role: "ADMIN" },
    select: { id: true, username: true, role: true },
  });

  console.log(`Updated ${user.username} (${user.id}) to ${user.role}.`);
}

main()
  .catch((error) => {
    console.error("Failed to elevate SamG:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
