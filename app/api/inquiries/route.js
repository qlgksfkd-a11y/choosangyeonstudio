const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/prisma");

// POST /api/inquiries → persists a booking inquiry for a photographer.
// Body: { photographerId, name, phone, category, date, message }
async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { photographerId, name, phone, category, date, message } = body;
  const errors = {};
  if (!name || !String(name).trim()) errors.name = "이름을 입력해주세요";
  if (!phone || !String(phone).trim()) errors.phone = "연락처를 입력해주세요";
  if (!message || !String(message).trim()) errors.message = "간단한 메시지를 남겨주세요";
  if (!Number.isInteger(Number(photographerId))) errors.photographerId = "작가 정보가 올바르지 않습니다";

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const photographer = await prisma.photographer.findUnique({
    where: { id: Number(photographerId) },
  });
  if (!photographer) {
    return NextResponse.json({ error: "photographer not found" }, { status: 404 });
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      photographerId: Number(photographerId),
      name: String(name).trim(),
      phone: String(phone).trim(),
      category: category || photographer.category,
      date: date || null,
      message: String(message).trim(),
    },
  });

  return NextResponse.json(inquiry, { status: 201 });
}

module.exports = { POST };
