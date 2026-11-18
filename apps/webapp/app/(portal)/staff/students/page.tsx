import type { Metadata } from "next";
import { MyStudents } from "@/components/teaching/MyStudents";
import type { SearchParams } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

export const metadata: Metadata = { title: "My students" };

export default async function MyStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff("/staff/students");
  return <MyStudents searchParams={searchParams} />;
}
