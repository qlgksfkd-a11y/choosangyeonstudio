const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/prisma");

// GET /api/photographers/:id → a single photographer's detail info.
async function GET(_request, { params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const photographer = await prisma.photographer.findUnique({ where: { id } });
  if (!photographer) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(photographer);
}

module.exports = { GET };
