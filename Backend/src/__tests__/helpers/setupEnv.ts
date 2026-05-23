const defaults: Record<string, string> = {
  NODE_ENV: "test",
  MONGO_URI: "mongodb://localhost:27017/resume-builder-test",
  FRONTEND_URL: "http://localhost:5173",
  FRONTEND_URLS: "",
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  RESEND_API_KEY: "test-resend-api-key",
  RESEND_FROM: "noreply@example.com",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  ENABLE_METRICS: "false",
  USE_MEMORY_ONLY_CACHE: "true",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const testOnlyOverrides: Record<string, string> = {
  GRAFANA_API_TOKEN: "",
  GRAFANA_LOKI_URL: "",
  GRAFANA_OTLP_ENDPOINT: "",
  LOKI_INSTANCE_ID: "",
  REDIS_URL: "",
  OTEL_EXPORTER_OTLP_ENDPOINT: "",
  OTEL_EXPORTER_OTLP_HEADERS: "",
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "",
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "",
  OTEL_INSTANCE_ID: "",
};

for (const [key, value] of Object.entries(testOnlyOverrides)) {
  process.env[key] = value;
}

if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-upstash-token";
}

if (process.env.UPSTASH_REDIS_REST_TOKEN && !process.env.UPSTASH_REDIS_REST_URL) {
  process.env.UPSTASH_REDIS_REST_URL = "https://example-upstash-url.test";
}
