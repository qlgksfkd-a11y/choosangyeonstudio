import { closeDb } from "./db";
import { runMigrations } from "./migrate";

// `npm run db:migrate` — 서버는 시작할 때 자동으로 마이그레이션을 적용하므로 수동 실행은 선택 사항이다.
runMigrations()
  .then(() => console.log("마이그레이션 완료"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
