import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const failures = new Rate("lekka_request_failures");
const discoveryLatency = new Trend("lekka_discovery_latency", true);

const baseUrl = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const apiKey = __ENV.SUPABASE_ANON_KEY || "";
const accessToken = __ENV.USER_ACCESS_TOKEN || apiKey;
const latitude = Number(__ENV.TEST_LATITUDE);
const longitude = Number(__ENV.TEST_LONGITUDE);
const allowProduction = __ENV.ALLOW_PRODUCTION_LOAD_TEST === "true";

if (!baseUrl || !apiKey || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
  throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_LATITUDE and TEST_LONGITUDE.");
}
if (/(supabase\.co|supabase\.in)$/i.test(new URL(baseUrl).hostname) && !allowProduction) {
  throw new Error("Refusing to load-test a hosted Supabase target without ALLOW_PRODUCTION_LOAD_TEST=true. Prefer staging.");
}

export const options = {
  scenarios: {
    read_only_discovery: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "60s", target: 10 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    lekka_request_failures: ["rate<0.01"],
    lekka_discovery_latency: ["p(95)<800"],
  },
};

const headers = {
  apikey: apiKey,
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

export default function () {
  // Read-only PostgREST discovery calls only. No writes, auth mutations, or payment endpoints.
  const response = http.post(
    `${baseUrl}/rest/v1/rpc/discover_nearby`,
    JSON.stringify({
      latitude,
      longitude,
      radius_meters: 5000,
      content_type_filter: "all",
      category_filter: null,
      search_query: null,
      result_limit: 50,
    }),
    { headers, tags: { endpoint: "discover_nearby" } },
  );

  const ok = check(response, {
    "discovery responds successfully": (r) => r.status === 200,
    "discovery response is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
  });
  failures.add(!ok);
  discoveryLatency.add(response.timings.duration);
  sleep(1);
}
