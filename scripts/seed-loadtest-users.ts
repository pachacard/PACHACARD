// scripts/seed-loadtest-users.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// cuántos usuarios quieres crear (puedes cambiarlo por env)
const TOTAL_USERS = Number(process.env.SEED_USERS || '5000');
const BATCH_SIZE = 500;

// tiers que usas en tu app (aunque en DB sean string)
const TIERS = ['BASIC', 'NORMAL', 'PREMIUM'] as const;


const TEST_PASSWORD_HASH = 'PON_AQUI_UN_HASH_REAL_O_DUMMY';

function randomTier(): string {
  const idx = Math.floor(Math.random() * TIERS.length);
  return TIERS[idx];
}

async function main() {
  console.log(` Creando ${TOTAL_USERS} usuarios de prueba para carga...`);

  for (let offset = 0; offset < TOTAL_USERS; offset += BATCH_SIZE) {
    const remaining = TOTAL_USERS - offset;
    const currentBatchSize = Math.min(BATCH_SIZE, remaining);

    const batch: Prisma.UserCreateManyInput[] = Array.from(
      { length: currentBatchSize },
      (_, i) => {
        const index = offset + i + 1;

        const user: Prisma.UserCreateManyInput = {
          // campos OBLIGATORIOS según tu modelo:
          email: `loadtest+${index}@pachacard.test`,
          name: `LoadTest User ${index}`,
          passwordHash: TEST_PASSWORD_HASH,
          tier: randomTier(),

          // NO hace falta mandar:
          // status, role, tokenVersion, createdAt, updatedAt
          // porque ya tienen @default en el schema
        };

        return user;
      },
    );

    console.log(
      `📝 Insertando usuarios ${offset + 1} – ${offset + currentBatchSize}`,
    );

    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log('✅ Seed de usuarios de prueba completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
