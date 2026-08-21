import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // Create an initial mock tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'tr1' },
    update: {
      name: 'Karjalan CS2 Cup #1',
      status: 'registration',
      date: new Date('2026-10-31T18:00:00Z'),
      prizePool: 50,
      teamCapacity: 64,
      entryFee: 0,
      format: 'Single Elimination',
      registrationDeadline: new Date('2026-10-30T23:59:59Z'),
    },
    create: {
      id: 'tr1',
      name: 'Karjalan CS2 Cup #1',
      status: 'registration',
      date: new Date('2026-10-31T18:00:00Z'),
      prizePool: 50,
      teamCapacity: 64,
      entryFee: 0,
      format: 'Single Elimination',
      registrationDeadline: new Date('2026-10-30T23:59:59Z'),
    },
  });

  console.log('Seed completed successfully:', tournament);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
