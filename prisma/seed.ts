// prisma/seed.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/* 1) Usuarios (upsert) */
async function seedUsers() {
  const users = [
    { email: "basic@demo.local",   name: "Basic",   tier: "BASIC",   role: "USER",  pass: "basic123" },
    { email: "normal@demo.local",  name: "Normal",  tier: "NORMAL",  role: "USER",  pass: "normal123" },
    { email: "premium@demo.local", name: "Premium", tier: "PREMIUM", role: "USER",  pass: "premium123" },
    { email: "admin@demo.local",   name: "Admin",   tier: "PREMIUM", role: "ADMIN", pass: "admin123" },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.pass, 10);
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      
      update: {
        name: u.name,
        // passwordHash, // <- descomenta si quieres forzar password en cada seed
        tier: u.tier,
        role: u.role,
        status: "ACTIVE",
      },
      create: {
        email: u.email.toLowerCase(),
        name: u.name,
        passwordHash,
        tier: u.tier,
        role: u.role,
        status: "ACTIVE",
      },
    });
  }
  console.log(" Usuarios listos");
}

/* 2) Categorías (upsert) */
/* 2) Categorías (upsert) */
async function seedCategories() {
  const categories = [
    { slug: "belleza",           name: "Belleza",           icon: "/icons/cats/belleza.png" },
    { slug: "entretenimiento",   name: "Entretenimiento",   icon: "/icons/cats/entretenimiento.png" },
    { slug: "viajes-y-turismo",  name: "Viajes y turismo",  icon: "/icons/cats/viajes.png" },
    { slug: "gastronomia",       name: "Gastronomía",       icon: "/icons/cats/gastronomia.png" },
    { slug: "productos",         name: "Productos",         icon: "/icons/cats/productos.png" },
    { slug: "bienestar-y-salud", name: "Bienestar y salud", icon: "/icons/cats/salud.png" },
    { slug: "servicios",         name: "Servicios",         icon: "/icons/cats/servicios.png" },
    // agrega más categorías aquí si quieres
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
  }

  console.log("Seed de categorías listo ");
}


/* Helper: enlaza descuento↔categoría (tabla puente) */
async function attach(code: string, slug: string) {
  const disc = await prisma.discount.findUnique({
    where: { code },
    select: { id: true },
  });
  const cat = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!disc || !cat) {
    console.log(`Saltando vínculo: no existe ${!disc ? "descuento" : "categoría"} (${code} -> ${slug})`);
    return;
  }
  await prisma.discountCategory.upsert({
    where: { discountId_categoryId: { discountId: disc.id, categoryId: cat.id } },
    update: {},
    create: { discountId: disc.id, categoryId: cat.id },
  });
}

/* 3) Vínculos descuento↔categoría */
async function seedLinks() {
  // Ajusta estos códigos/slug a tus datos reales
  await attach("RESTO10", "gastronomia");
  await attach("CAFE15",  "gastronomia");
  await attach("GYM20",   "bienestar-y-salud");
  console.log(" Vínculos descuento↔categoría listos");
}

async function main() {
  await seedUsers();
  await seedCategories();
  await seedLinks();
  console.log("🌱 Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
