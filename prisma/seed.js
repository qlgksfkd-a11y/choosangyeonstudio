// Seeds the database with the original prototype's photographer data.
// Run automatically by `prisma migrate` / manually via `npm run prisma:seed`.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PHOTOGRAPHERS = [
  { id: 1, name: "김도윤", studio: "스튜디오 라인", category: "프로필/인물", region: "서울 강남", priceFrom: 150000, tagline: "자연광으로 담는 담백한 인물 사진", bio: "과장 없는 표정과 분위기를 좋아합니다. 프로필, 이력서용 촬영을 주로 진행해요.", badge: "추천", photoUrl: "/images/profile_img_1.jpg" },
  { id: 6, name: "한소미", studio: "라이트키퍼", category: "프로필/인물", region: "서울 종로", priceFrom: 180000, tagline: "임원·전문직을 위한 격식 있는 프로필", bio: "변호사, 의료진, 기업 임원 프로필 촬영 경험이 많습니다.", badge: "인기", photoUrl: "/images/profile_img_2.jpg" },
  { id: 7, name: "오지환", studio: "모노그램", category: "프로필/인물", region: "서울 여의도", priceFrom: 200000, tagline: "이력서·프로필용 정갈한 인물사진", bio: "군더더기 없는 배경과 조명으로 신뢰감 있는 프로필을 만듭니다.", badge: null, photoUrl: "/images/profile_img_3.jpg" },
  { id: 2, name: "이서연", studio: "필름로그", category: "웨딩", region: "제주", priceFrom: 550000, tagline: "필름 감성의 웨딩스냅", bio: "빛과 여백을 살린 다큐멘터리 스타일 웨딩스냅을 촬영합니다.", badge: "인기", photoUrl: null },
  { id: 8, name: "강태욱", studio: "헤이보이 스튜디오", category: "웨딩", region: "서울 청담", priceFrom: 480000, tagline: "웨딩홀 본식 스냅 전문", bio: "본식 현장의 흐름을 놓치지 않는 동선 설계가 강점입니다.", badge: "추천", photoUrl: null },
  { id: 9, name: "서지민", studio: "델피늄", category: "웨딩", region: "부산", priceFrom: 520000, tagline: "해변 배경 웨딩스냅", bio: "해운대, 광안리 등 부산 로케이션 웨딩스냅을 전문으로 합니다.", badge: null, photoUrl: null },
  { id: 3, name: "박현우", studio: "온기사진관", category: "가족", region: "서울 마포", priceFrom: 120000, tagline: "아이의 표정을 놓치지 않는 가족사진", bio: "정적인 포즈보다 자연스러운 순간을 기다려 담습니다.", badge: "추천", photoUrl: "/images/family_img_2.jpg" },
  { id: 10, name: "임하은", studio: "봄날스튜디오", category: "가족", region: "서울 잠실", priceFrom: 130000, tagline: "형제자매까지 함께 담는 가족사진", bio: "여러 명이 함께하는 촬영에서 자연스러운 구도를 잘 잡습니다.", badge: null, photoUrl: "/images/family_img_3.jpg" },
  { id: 11, name: "노승우", studio: "마루스튜디오", category: "가족", region: "경기 분당", priceFrom: 140000, tagline: "삼대가 함께하는 자연광 가족사진", bio: "야외 자연광 촬영을 선호하며, 어르신 촬영 경험이 풍부합니다.", badge: "인기", photoUrl: "/images/family_img_4.jpg" },
  { id: 4, name: "최윤아", studio: "네발스튜디오", category: "반려동물", region: "서울 성수", priceFrom: 90000, tagline: "반려동물의 성격이 드러나는 촬영", bio: "간식과 장난감으로 최대한 편안한 분위기를 만든 뒤 촬영해요.", badge: "추천", photoUrl: null },
  { id: 12, name: "조은별", studio: "왈파티", category: "반려동물", region: "서울 연남", priceFrom: 95000, tagline: "강아지 생일 컨셉 촬영 전문", bio: "소품과 세트를 활용한 생일·기념일 컨셉 촬영을 진행합니다.", badge: null, photoUrl: null },
  { id: 13, name: "문가람", studio: "캣워크스튜디오", category: "반려동물", region: "서울 홍대", priceFrom: 85000, tagline: "고양이 전문 실내 촬영", bio: "고양이의 낯가림을 고려한 저자극 촬영 방식을 씁니다.", badge: "인기", photoUrl: null },
  { id: 5, name: "정민석", studio: "블록스튜디오", category: "상업/제품", region: "서울 성동", priceFrom: 200000, tagline: "브랜드 톤을 살리는 제품 촬영", bio: "이커머스 상세페이지부터 룩북까지, 브랜드 무드에 맞춰 촬영합니다.", badge: null, photoUrl: null },
  { id: 14, name: "배수현", studio: "앵글웍스", category: "상업/제품", region: "서울 을지로", priceFrom: 250000, tagline: "이커머스 상세페이지 전문", bio: "전환율을 고려한 상세페이지용 컷 구성을 함께 기획합니다.", badge: "추천", photoUrl: null },
  { id: 15, name: "홍성진", studio: "스틸라이프", category: "상업/제품", region: "서울 문래", priceFrom: 220000, tagline: "F&B 브랜드 화보 촬영", bio: "카페, 레스토랑 등 F&B 브랜드 화보와 메뉴판 촬영을 전문으로 합니다.", badge: null, photoUrl: null },
];

async function main() {
  for (const p of PHOTOGRAPHERS) {
    await prisma.photographer.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log(`Seeded ${PHOTOGRAPHERS.length} photographers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
