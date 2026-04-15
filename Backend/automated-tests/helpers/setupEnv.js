const defaults = {
  NODE_ENV: "development",
  MONGO_URI: "mongodb://localhost:27017/resume-builder-test",
  FRONTEND_URL: "http://localhost:5173",
  FRONTEND_URLS: "",
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  RESEND_API_KEY: "test-resend-api-key",
  RESEND_FROM: "noreply@example.com",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-upstash-token";
}

if (process.env.UPSTASH_REDIS_REST_TOKEN && !process.env.UPSTASH_REDIS_REST_URL) {
  process.env.UPSTASH_REDIS_REST_URL = "https://example-upstash-url.test";
}
