# 상담 빠른복사 (Counsel Quick Copy)

상담 중 자주 쓰는 문장과 이미지를 카테고리별로 저장해 두고, 모바일에서 한 번의 탭으로 클립보드에 복사해 카카오톡 등에 붙여넣는 모바일 우선 PWA.

**스택**: React 19 · TypeScript · Vite · Tailwind CSS 4 · Radix/shadcn 스타일 UI · tRPC 11 · Express 4 · Drizzle ORM · MySQL/TiDB · S3 호환 스토리지 · @dnd-kit · vite-plugin-pwa · Vitest

## 실행

```bash
cp .env.example .env        # DATABASE_URL, SESSION_SECRET 등을 채운다
npm install
npm run dev                 # http://localhost:3000 (시작할 때 DB 마이그레이션 자동 적용)
```

```bash
npm run check               # 타입 검사
npm test                    # 테스트 (아래 참고)
npm run build && npm start  # 프로덕션 빌드 / 실행
```

### 테스트
서버 API 테스트는 실제 MySQL 호환 DB가 필요합니다. 기본값은 `mysql://counsel:counsel@localhost:3306/counsel_test` 이며
`TEST_DATABASE_URL` 로 바꿀 수 있습니다. **테스트 시작 시 그 DB의 테이블을 지우므로 운영 DB를 가리키지 마세요.**

브라우저 스모크 테스트(서버 실행 후): `BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs`
(모바일/PC 뷰포트에서 가입 → 복사 → 핀 → 순서 변경 → 이미지 → 카테고리 → 검색 → 마우스 드래그를 확인)

## 원본 주문서와 달라진 점 / 결정 사항
- **인증**: Manus OAuth 대신 이메일+비밀번호(scrypt 해시, 서명된 httpOnly 쿠키)를 직접 구현했습니다. 사용자별 소유권 검증은 모든 프로시저에 적용됩니다.
- **이미지 저장소**: `S3_BUCKET` 등을 설정하면 S3 호환 스토리지(AWS S3, R2, MinIO…), 비워 두면 `UPLOAD_DIR`(기본 `.data/uploads`, 정적 폴더 아님)에 저장합니다. DB에는 URL·fileKey·filename·mimeType만 기록합니다.
- **이미지 전달**: 이미지는 `/files/<key>` 로 서버가 소유자 확인 후 전달합니다(같은 출처라 복사·다운로드에 CORS가 필요 없음). 이 경로와 `/api/trpc` 외에 REST API는 없습니다.
- **업로드**: tRPC(base64, 5MB 제한)로 전송합니다. 진행 표시는 실제 퍼센트가 아닌 "업로드 중" 진행 막대입니다.
- **카테고리 삭제**: 포함된 문장·이미지가 함께 삭제되며, 삭제 전 확인창에 개수를 보여줍니다.
- **드래그 대체 수단**: 문장은 위/아래 버튼과 키보드(핸들에서 Space), 카테고리는 편집 창의 앞으로/뒤로 버튼으로도 순서를 바꿀 수 있습니다.
- 이미지 순서 변경, CSV 가져오기/내보내기, 복사 통계 등은 1차 범위 밖입니다(DB에는 `images.sortOrder` 준비됨).

## 배포 시 확인
- HTTPS 필수(클립보드 API·PWA·`secure` 쿠키). `NODE_ENV=production`, `SESSION_SECRET`(16자 이상) 필요.
- 실제 폰(카카오톡 붙여넣기, iOS 홈 화면 추가)과 Chrome 데스크톱 설치는 배포 후 직접 확인해야 합니다.
