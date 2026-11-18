import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openapi } from "./docs/openapi";
import { db } from "./lib/db";
import { logger } from "./lib/logger";
import { clientContext } from "./middleware/client-context";
import { errorHandler, notFound } from "./middleware/errors";
import { announcementsRouter, notificationsRouter } from "./modules/announcements/routes";
import { approvalsRouter, myLeaveRouter, publicRegistrationsRouter } from "./modules/approvals/routes";
import { websiteIntakeRouter } from "./modules/approvals/website-intake";
import { myTeachingRouter } from "./modules/teaching/routes";
import { attendanceRouter } from "./modules/attendance/routes";
import { authRouter } from "./modules/auth/routes";
import { contentRouter, enquiryIntakeRouter, publicContentRouter } from "./modules/content/routes";
import { competitionsRouter, coursesRouter } from "./modules/courses/routes";
import { dashboardRouter } from "./modules/dashboard/routes";
import { feesRouter, paymentsRouter } from "./modules/fees/routes";
import { filesRouter, publicFilesRouter } from "./modules/files/routes";
import { classUpdatesRouter, homeworkRouter } from "./modules/homework/routes";
import { marksRouter } from "./modules/marks/routes";
import { metaRouter } from "./modules/meta/routes";
import { assignmentsRouter, papersRouter } from "./modules/papers/routes";
import { reportsRouter } from "./modules/reports/routes";
import { rfidDeviceRouter, rfidRouter } from "./modules/rfid/routes";
import { staffRouter } from "./modules/staff/routes";
import { studentsRouter } from "./modules/students/routes";
import { auditRouter, profileRouter, settingsRouter } from "./modules/system/routes";

/**
 * Builds the Express app (no listening; see server.ts). No CORS: browsers never call this
 * API directly. The webapp calls it from its own server (BFF), and the mobile app isn't a
 * browser.
 */
export function createApp() {
  const e = env();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", e.TRUST_PROXY_HOPS);
  app.set("json spaces", 0);

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set("X-Request-Id", req.requestId);
    const start = performance.now();
    res.on("finish", () => {
      // Path only: never the query string (it could carry a token) or the body.
      logger.info({ rid: req.requestId, m: req.method, p: req.path, s: res.statusCode, ms: Math.round(performance.now() - start) }, "request");
    });
    next();
  });

  // Swagger UI needs inline scripts/styles, so it gets its own CSP below.
  const docsEnabled = e.API_DOCS === "true" || (e.API_DOCS === "" && e.NODE_ENV !== "production");
  if (docsEnabled) {
    app.use("/docs", helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Dynamic Donalds API" }));
    app.get("/openapi.json", (_req, res) => res.json(openapi));
  }

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "64kb", strict: true }));
  app.use(clientContext);

  app.get("/health", async (_req, res) => {
    try {
      await db().$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "db_unavailable" });
    }
  });

  app.use("/v1/auth", authRouter);

  // Portal (admin & staff). Every router checks the session and role itself.
  app.use("/v1/meta", metaRouter);
  app.use("/v1/dashboard", dashboardRouter);
  app.use("/v1/approvals", approvalsRouter);
  app.use("/v1/leave/mine", myLeaveRouter);
  app.use("/v1/me/teaching", myTeachingRouter);
  app.use("/v1/students", studentsRouter);
  app.use("/v1/staff", staffRouter);
  app.use("/v1/courses", coursesRouter);
  app.use("/v1/competitions", competitionsRouter);
  app.use("/v1/attendance", attendanceRouter);
  app.use("/v1/homework", homeworkRouter);
  app.use("/v1/class-updates", classUpdatesRouter);
  app.use("/v1/assignments", assignmentsRouter);
  app.use("/v1/question-papers", papersRouter);
  app.use("/v1/tests", marksRouter);
  app.use("/v1/fees", feesRouter);
  app.use("/v1/payments", paymentsRouter);
  app.use("/v1/reports", reportsRouter);
  app.use("/v1/announcements", announcementsRouter);
  app.use("/v1/notifications", notificationsRouter);
  app.use("/v1/rfid/device", rfidDeviceRouter); // before /v1/rfid (admin-only)
  app.use("/v1/rfid", rfidRouter);
  app.use("/v1/content", contentRouter);
  app.use("/v1/audit", auditRouter);
  app.use("/v1/settings", settingsRouter);
  app.use("/v1/profile", profileRouter);
  app.use("/v1/files", filesRouter);

  // Devices, website and mobile-app intake (no portal session).
  app.use("/v1/public/files", publicFilesRouter);
  app.use("/v1/public/content", publicContentRouter);
  app.use("/v1/public/registrations", publicRegistrationsRouter);
  app.use("/v1/public/intake", websiteIntakeRouter);
  app.use(["/enquiries", "/v1/enquiries"], enquiryIntakeRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
