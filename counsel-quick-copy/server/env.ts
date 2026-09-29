export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "mysql://counsel:counsel@localhost:3306/counsel";
  },
  get sessionSecret() {
    const s = process.env.SESSION_SECRET;
    if (s && s.length >= 16) return s;
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET 환경변수(16자 이상)가 필요합니다.");
    }
    return "dev-only-insecure-secret";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get port() {
    return Number(process.env.PORT ?? 3000);
  },
  get uploadDir() {
    return process.env.UPLOAD_DIR ?? ".data/uploads";
  },
  s3: {
    get bucket() {
      return process.env.S3_BUCKET ?? "";
    },
    get region() {
      return process.env.S3_REGION ?? "auto";
    },
    get endpoint() {
      return process.env.S3_ENDPOINT || undefined;
    },
    get accessKeyId() {
      return process.env.S3_ACCESS_KEY_ID ?? "";
    },
    get secretAccessKey() {
      return process.env.S3_SECRET_ACCESS_KEY ?? "";
    },
  },
};
