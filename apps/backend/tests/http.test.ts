import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { useTestEnv } from "./helpers";

/** HTTP-level checks that need no database (validation, headers, 404, auth gate). */
describe("HTTP surface", () => {
  let app: ReturnType<typeof createApp>;
  beforeAll(() => {
    useTestEnv();
    app = createApp();
  });

  it("rejects invalid login bodies with field errors", async () => {
    const res = await request(app).post("/v1/auth/login").send({ email: "nope", password: "", portal: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBe("Enter a valid email address.");
  });

  it("rejects malformed JSON without leaking internals", async () => {
    const res = await request(app).post("/v1/auth/login").set("content-type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid request body.");
  });

  it("requires a bearer token for /me", async () => {
    const res = await request(app).get("/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logout without a session is still a success", async () => {
    expect((await request(app).post("/v1/auth/logout")).status).toBe(204);
  });

  it("sets security headers and never caches", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("forgot password answers the same for any email", async () => {
    const res = await request(app).post("/v1/auth/password/forgot").send({ email: "Someone@Example.com" });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ sentTo: "s•••@example.com", expiresInMinutes: 30 });
  });
});
