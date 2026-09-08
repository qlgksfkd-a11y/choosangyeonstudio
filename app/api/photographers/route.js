const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/prisma");

// GET /api/photographers?category=웨딩  → list photographers, optionally
// filtered by category. Backed by the Photographer table (SQLite via Prisma).
async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const photographers = await prisma.photographer.findMany({
    where: category ? { category } : undefined,
    orderBy: { id: "asc" },
  });

  return NextResponse.json(photographers);
}

module.exports = { GET };
