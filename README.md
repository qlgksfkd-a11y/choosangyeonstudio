# 루페 (Loupe) — 사진작가 예약 플랫폼

원본 React 프로토타입(`PhotographerPlatformPrototype.jsx`)의 디자인을 그대로 유지하면서,
실제 데이터베이스에 연결된 Next.js 사이트로 옮긴 버전입니다.

## 무엇이 바뀌었나

- **프레임워크**: 단일 JSX 프로토타입 → Next.js (App Router) 프로젝트
- **데이터**: 하드코딩된 `PHOTOGRAPHERS` 배열 → Prisma ORM + Postgres 데이터베이스
  (`Photographer`, `Inquiry` 테이블). Vercel 등 서버리스 호스팅에 배포해도 데이터가
  사라지지 않도록 처음부터 클라우드 DB(Postgres)를 기준으로 만들었습니다.
- **작가 목록**: 홈 화면이 `/api/photographers`를 호출해 DB에서 실시간으로 불러옵니다.
- **문의하기**: 문의 폼 제출 시 `/api/inquiries`(POST)로 실제 DB에 저장됩니다
  (이전에는 로컬 state만 바뀌고 사라졌습니다).
- **이미지**: 프로토타입에 inline base64로 박혀 있던 인물/가족 사진을 `public/images/`
  아래 실제 파일로 분리했습니다. (디자인/화질은 동일)
- **찜하기(하트)**: 회원 계정이 없어 우선 브라우저 `localStorage`에 저장됩니다. 로그인 기능을
  추가하면 서버 테이블로 옮기기 쉽도록 구조를 분리해뒀습니다.
- 그 외 레이아웃, 색상, 타이포그래피, 화면 전환(홈 → 상세 → 문의) 흐름은 원본과 동일합니다.

## 시작하기 (로컬에서 실행)

1. `.env.example`을 복사해서 `.env` 파일을 만들고, `DATABASE_URL`에 실제 Postgres 접속
   주소를 넣습니다. (아래 "인터넷에 배포하기"에서 만든 DB의 연결 주소를 그대로 써도 됩니다)
2. 아래 명령 실행:

```bash
npm install    # 의존성 설치 (Prisma client 자동 생성)
npm run dev    # http://localhost:3000 — 처음 실행 시 DB 스키마 생성 + 데이터 시드는
               # `npm run build` 안에 포함돼 있으니, 로컬에서 스키마만 맞추고 싶다면
               # `npm run db:push && npm run db:seed` 를 한 번 실행하세요.
```

## 인터넷에 배포하기 (Vercel + Neon, 둘 다 무료)

지금까지 우리 컴퓨터 안에서만 돌아가던 사이트를, 누구나 접속할 수 있는 진짜 주소로
만드는 과정입니다. 계정 가입/클릭 몇 번이면 끝나요.

### 1) 데이터베이스(Postgres) 무료로 만들기

1. Vercel 대시보드(vercel.com)에 GitHub 계정으로 로그인/가입합니다.
2. 프로젝트를 만들기 전이라면, 먼저 **Storage** 탭 → **Create Database** →
   **Neon (Postgres)** 선택 → 무료 플랜으로 생성합니다.
   (이미 프로젝트를 만들었다면 프로젝트의 **Storage** 탭에서도 같은 방식으로 추가할 수 있어요)
3. 생성되면 `DATABASE_URL` 같은 이름의 연결 주소가 자동으로 발급됩니다. (이 값은 나중에
   프로젝트에 자동으로 연결되니 따로 복사해둘 필요는 없습니다)

### 2) 이 GitHub 저장소를 Vercel 프로젝트로 가져오기

1. Vercel 대시보드에서 **Add New… → Project** 클릭
2. `qlgksfkd-a11y/choosangyeonstudio` 저장소 선택 → **Import**
3. **Environment Variables** 화면에서 위에서 만든 데이터베이스의 `DATABASE_URL`이
   자동으로 채워져 있는지 확인합니다. (Storage에서 만든 DB를 프로젝트에 "Connect"
   했다면 자동으로 들어가 있어요. 안 보이면 프로젝트 설정 → Storage에서 DB를 연결해주세요)
4. **Deploy** 클릭

빌드가 진행되면서 자동으로 ①데이터베이스에 표(스키마) 생성 → ②작가 15명 초기 데이터 저장
→ ③사이트 빌드 순서로 실행됩니다. 몇 분 후 `https://프로젝트이름.vercel.app` 형태의
주소가 발급되고, 그 주소로 바로 접속해서 실제로 동작하는 사이트를 볼 수 있어요.

### 3) 이후 업데이트

이 브랜치(`claude/database-connection-setup-6ruf5z`)에 새 코드를 올릴 때마다 Vercel이
자동으로 다시 빌드해서 같은 주소에 반영합니다. 별도 명령을 실행할 필요가 없습니다.

### 나중에 내 도메인을 연결하고 싶다면

Vercel 프로젝트의 **Settings → Domains**에서 구매한 도메인(예: choosangyeonstudio.com)을
추가하고, 도메인을 산 곳(가비아, 후이즈 등)에서 안내되는 DNS 값을 입력하면 연결됩니다.
지금 당장은 필요 없고, 나중에 원하실 때 말씀해주시면 그때 같이 진행해요.

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
  schema.prisma          DB 스키마 (Postgres)
  seed.js                초기 작가 데이터 시드 (여러 번 실행해도 안전, upsert 방식)
public/images/           작가/카테고리 사진
lib/prisma.js            Prisma Client 싱글턴
```

## 남은 과제 (요청 범위 밖)

- "작가 등록" 버튼은 원본과 동일하게 아직 동작이 연결돼 있지 않습니다.
- 찜하기는 기기별 로컬 저장이며, 로그인/회원 기능이 생기면 서버 DB로 이전 권장합니다.
