import type { Metadata } from "next";
import { HeroFrame } from "@/components/HeroFrame";
import { RegistrationForm } from "./RegistrationForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Register your child at Dynamic Donalds. Fill in the student and parent details, choose the courses and upload the school ID card.",
};

const steps = [
  { title: "Fill in the details", text: "Student, parents, address and the courses you want." },
  { title: "Upload the school ID card", text: "A clear photo or PDF of the card the student carries." },
  { title: "We review and confirm", text: "The school checks the registration and emails login details to the parent." },
];

export default function RegisterPage() {
  return (
    <HeroFrame>
      <div className="grid gap-8 px-5 pb-5 pt-12 md:px-8 md:pb-8 lg:grid-cols-[1fr_1.45fr] lg:gap-12 lg:pt-16">
        <div className="flex flex-col gap-10 lg:sticky lg:top-8 lg:self-start">
          <div>
            <p className="eyebrow">Admissions</p>
            <h1 className="display mt-8 text-[2.7rem] text-ink sm:text-6xl lg:text-[4rem]">
              Register <span className="text-brand">your</span>
              <br />
              <span className="text-sun">child</span> today
            </h1>
            <p className="mt-8 max-w-[22rem] text-[0.85rem] leading-snug text-ink-soft">
              It takes about <strong className="font-semibold text-ink">five minutes.</strong> Have the student’s school ID card ready to upload.
            </p>
          </div>
          <ol className="grid gap-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-[1.25rem] bg-white p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun text-sm font-semibold text-ink">{i + 1}</span>
                <span>
                  <span className="block text-sm font-medium text-ink">{s.title}</span>
                  <span className="mt-1 block text-[0.8rem] leading-snug text-ink-soft">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[1.5rem] bg-white p-6 sm:p-10">
          <RegistrationForm />
        </div>
      </div>
    </HeroFrame>
  );
}
