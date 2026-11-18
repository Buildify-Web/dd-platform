import { NextResponse, type NextRequest } from "next/server";
import { REG_GRADES } from "@/lib/registration";

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const GRADE_VALUES: readonly string[] = REG_GRADES.map((g) => g.value);

/** Courses offered for one grade, for the registration form's course dropdown. */
export async function GET(req: NextRequest) {
  const grade = req.nextUrl.searchParams.get("grade") ?? "";
  if (!GRADE_VALUES.includes(grade)) return json({ error: "Choose a valid grade." }, 422);

  const backend = process.env.BACKEND_API_URL;
  if (!backend) {
    // Without this the form would show "no courses" and hide the real problem.
    console.error("[registration] BACKEND_API_URL is not set; the course list can't load");
    return json({ error: "The course list isn’t available right now. Please try again later." }, 503);
  }

  try {
    const url = new URL("/v1/public/intake/courses", backend);
    url.searchParams.set("grade", grade);
    const res = await fetch(url, {
      headers: { "X-Internal-Key": process.env.WEBSITE_INTERNAL_API_KEY ?? "" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return json({ error: "We couldn’t load the courses. Please try again." }, 502);
    return json(await res.json(), 200);
  } catch {
    return json({ error: "We couldn’t load the courses. Please try again." }, 502);
  }
}
