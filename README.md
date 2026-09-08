# 루페 (Loupe) — 사진작가 예약 플랫폼

원본 React 프로토타입(`PhotographerPlatformPrototype.jsx`)의 디자인을 그대로 유지하면서,
실제 데이터베이스에 연결된 Next.js 사이트로 옮긴 버전입니다.

## 무엇이 바뀌었나

- **프레임워크**: 단일 JSX 프로토타입 → Next.js (App Router) 프로젝트
- **데이터**: 하드코딩된 `PHOTOGRAPHERS` 배열 → Prisma ORM + SQLite 데이터베이스
  (`Photographer`, `Inquiry` 테이블)
- **작가 목록**: 홈 화면이 `/api/photographers`를 호출해 DB에서 실시간으로 불러옵니다.
- **문의하기**: 문의 폼 제출 시 `/api/inquiries`(POST)로 실제 DB에 저장됩니다
  (이전에는 로컬 state만 바뀌고 사라졌습니다).
- **이미지**: 프로토타입에 inline base64로 박혀 있던 인물/가족 사진을 `public/images/`
  아래 실제 파일로 분리했습니다. (디자인/화질은 동일)
- **찜하기(하트)**: 회원 계정이 없어 우선 브라우저 `localStorage`에 저장됩니다. 로그인 기능을
  추가하면 서버 테이블로 옮기기 쉽도록 구조를 분리해뒀습니다.
- 그 외 레이아웃, 색상, 타이포그래피, 화면 전환(홈 → 상세 → 문의) 흐름은 원본과 동일합니다.

## 시작하기

```bash
npm install          # 의존성 설치 (Prisma client 자동 생성)
npx prisma migrate dev   # DB 스키마 생성 + 시드 데이터 삽입 (최초 1회)
npm run dev           # http://localhost:3000
```

DB 파일은 `prisma/dev.db` (SQLite)로 생성되며 git에는 포함되지 않습니다. 다시 만들고 싶다면
`npx prisma migrate reset`.

## 프로덕션 배포 시 DB 교체

지금은 별도 설정 없이 바로 돌아가도록 SQLite를 기본값으로 썼습니다. 운영 환경에서
Postgres/MySQL(예: Supabase, Neon, PlanetScale)로 옮기려면:

1. `prisma/schema.prisma`의 `datasource db`에서 `provider`를 `postgresql`(또는 `mysql`)로 변경
2. `.env`의 `DATABASE_URL`을 해당 DB 접속 문자열로 교체
3. `npx prisma migrate deploy`

애플리케이션 코드(API 라우트, 컴포넌트)는 Prisma를 통해서만 DB에 접근하므로 변경할 필요가 없습니다.

## 폴더 구조

```
app/
  layout.js            루트 레이아웃
  page.js              홈 페이지 엔트리
  PlatformApp.jsx       원본 프로토타입 UI 전체 (클라이언트 컴포넌트)
  api/
    photographers/       GET 목록 / [id] GET 상세
    inquiries/            POST 문의 등록
prisma/
  schema.prisma          DB 스키마
  seed.js                초기 작가 데이터 시드
public/images/           작가/카테고리 사진
lib/prisma.js            Prisma Client 싱글턴
```

## 남은 과제 (요청 범위 밖)

- "작가 등록" 버튼은 원본과 동일하게 아직 동작이 연결돼 있지 않습니다.
- 찜하기는 기기별 로컬 저장이며, 로그인/회원 기능이 생기면 서버 DB로 이전 권장합니다.
