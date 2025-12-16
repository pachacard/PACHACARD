// lib/db.ts
import { prisma } from "@/lib/prisma";

/**
 * Tipo de membresía del contribuyente.
 * Importante: debe coincidir con los valores guardados en BD (User.tier).
 */
type Tier = "BASIC" | "NORMAL" | "PREMIUM";

/**
 * Construye un filtro Prisma para aplicar visibilidad por tier usando flags booleanos
 * en Discount (tierBasic, tierNormal, tierPremium).
 *
 * Idea clave:
 * - No guardas "tier permitido" como enum dentro de Discount, sino como 3 booleans.
 * - Por eso el filtro es "tierX = true" según el tier del usuario.
 *
 * @param tier Tier del usuario (opcional)
 * @returns Objeto "where" parcial para Prisma
 */
function tierWhere(tier?: Tier) {
  if (!tier) return {};
  if (tier === "BASIC") return { tierBasic: true };
  if (tier === "NORMAL") return { tierNormal: true };
  return { tierPremium: true };
}

/**
 * Filtro de "publicado y vigente en este momento".
 *
 * Reglas:
 * - Solo descuentos con status PUBLISHED
 * - startAt <= now <= endAt
 *
 * Nota:
 * - Se evalúa con "now" del servidor (no del cliente).
 * - Esto garantiza consistencia al filtrar resultados.
 *
 * @returns Objeto "where" parcial para Prisma
 */
function publishedNowWhere() {
  const now = new Date();
  return {
    status: "PUBLISHED" as const,
    startAt: { lte: now },
    endAt: { gte: now },
  };
}

/**
 * Regla defensiva de integridad:
 * Evita mostrar descuentos que tengan más de un tier habilitado simultáneamente.
 *
 * Motivación:
 * - En tu lógica actual, un descuento debe ser exclusivo de un tier
 *   (BASIC o NORMAL o PREMIUM).
 * - Si por error en admin se activan 2 flags a la vez, esto lo bloquea.
 *
 * Si más adelante decides permitir descuentos multi-tier, elimina este filtro.
 */
const notMixedTier = {
  NOT: [
    { tierBasic: true, tierNormal: true },
    { tierBasic: true, tierPremium: true },
    { tierNormal: true, tierPremium: true },
  ],
};

/* -----------------------------------------------------------------------------
 * 1) Categorías con conteo de descuentos visibles para el tier del usuario
 *
 * Uso típico:
 * - Población de "CategoryPills" en el portal del contribuyente:
 *   nombre de categoría + cantidad de descuentos disponibles (vigentes, publicados y por tier).
 *
 * Diseño:
 * - Se consulta Category e incluye DiscountCategory filtrando por Discount con "discountWhere".
 * - El conteo se construye en memoria con cat.discounts.length.
 *
 * Limitación:
 * - Esto NO usa un count agregado directo de Prisma; es correcto pero puede ser más pesado
 *   si la base crece mucho (porque trae IDs de relación).
 * - Si escala, se puede migrar a query agregada/SQL o a _count con filtros (según versión Prisma).
 * --------------------------------------------------------------------------- */

/**
 * Devuelve categorías ordenadas alfabéticamente con conteo de descuentos visibles para un tier.
 *
 * @param tier Tier del usuario (opcional). Si no se manda, no filtra por tier.
 * @returns Arreglo de categorías con un pseudo `_count.discounts` calculado.
 */
export async function getCategoriesWithCountsForUser(tier?: Tier) {
  const discountWhere = {
    ...publishedNowWhere(),
    ...tierWhere(tier),
    ...notMixedTier,
  };

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      discounts: {
        where: {
          // Category -> DiscountCategory -> Discount
          discount: discountWhere,
        },
        select: {
          // Solo necesitamos contar relaciones, no traer todo el descuento
          discountId: true,
        },
      },
    },
  });

  // Se agrega _count.discounts calculado con las relaciones filtradas
  return categories.map((cat) => ({
    ...cat,
    _count: {
      discounts: cat.discounts.length,
    },
  })) as any;
}

/* -----------------------------------------------------------------------------
 * 2) Descuentos filtrados por categoría (slug) y por tier del usuario.
 *
 * Reglas aplicadas:
 * - Publicado y vigente (publishedNowWhere)
 * - Visible para el tier (tierWhere)
 * - No ambiguo por multi-tier (notMixedTier)
 *
 * Incluye:
 * - business mínimo para mostrar nombre e imagen
 * - categorías embebidas para UI (pills/tags)
 *
 * Paginación:
 * - take: 24 (limita resultados)
 * - orderBy createdAt desc (últimos creados primero)
 * --------------------------------------------------------------------------- */

/**
 * Obtiene descuentos visibles para un usuario, con filtro opcional de categoría por slug.
 *
 * @param slug Slug de categoría (opcional)
 * @param tier Tier del usuario (opcional)
 * @returns Descuentos con business y categorías incluidas
 */
export async function getDiscountsByCategorySlugForUser(slug?: string, tier?: Tier) {
  return prisma.discount.findMany({
    where: {
      ...publishedNowWhere(),
      ...tierWhere(tier),
      ...(slug
        ? { categories: { some: { category: { slug } } } } // Discount -> DiscountCategory -> Category
        : {}),
      ...notMixedTier,
    },
    include: {
      business: { select: { id: true, name: true, imageUrl: true } },
      categories: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
}

/* -----------------------------------------------------------------------------
 * 3) Negocios, con filtro opcional por slug de categoría.
 *
 * Regla:
 * - Si categorySlug existe, el negocio se incluye si:
 *   (a) el negocio tiene esa categoría asignada directamente, o
 *   (b) algún descuento del negocio tiene esa categoría.
 *
 * Nota importante:
 * - _count.discounts cuenta todos los descuentos relacionados (histórico),
 *   no filtra por vigencia o status.
 *   Si quieres "descuentos vigentes publicados", necesitas un conteo filtrado adicional.
 * --------------------------------------------------------------------------- */

/**
 * Devuelve negocios; opcionalmente filtrados por categoría.
 *
 * @param opts.categorySlug Slug de categoría para filtrar (opcional)
 * @returns Lista de negocios con categorías directas y count de descuentos (total histórico)
 */
export async function getBusinesses(opts?: { categorySlug?: string }) {
  const byCategory = opts?.categorySlug
    ? {
        OR: [
          // 1) Categoría asignada al propio negocio
          { categories: { some: { category: { slug: opts.categorySlug } } } },
          // 2) Categoría asignada a cualquier descuento del negocio
          {
            discounts: {
              some: {
                categories: { some: { category: { slug: opts.categorySlug } } },
              },
            },
          },
        ],
      }
    : {};

  return prisma.business.findMany({
    where: byCategory,
    include: {
      categories: { include: { category: true } },
      _count: { select: { discounts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Aliases para mantener compatibilidad con páginas antiguas.
 * Evita romper imports existentes si en el frontend se usa el nombre previo.
 */
export const getCategoriesWithCounts = getCategoriesWithCountsForUser;
export const getDiscountsByCategorySlug = getDiscountsByCategorySlugForUser;
