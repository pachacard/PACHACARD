// app/api/admin/businesses/[id]/image/route.ts
import { NextResponse } from "next/server";

// En Vercel no se debe escribir en /public/uploads.
// Usar imageUrl remoto o un endpoint /api/upload que devuelva { url } (Cloudinary/S3).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Subida local deshabilitada. Usa imageUrl con una URL remota (https/https o data:) o un endpoint /api/upload que devuelva {url}.",
      businessId: params.id,
    },
    { status: 410 }
  );
}
