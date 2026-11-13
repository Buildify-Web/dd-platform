/**
 * Institute-wide details used across the public website.
 * Replace the sample address / hours with the real values when supplied.
 */
export const site = {
  name: "Dynamic Donalds",
  tagline: "Education is Life",
  description:
    "Tuition and competition coaching for Pre-KG to Grade 12, online and offline. Regular tuition, Maths & Science Olympiad, Spell Bee, Phonics and board exam preparation.",
  phoneDisplay: "+91 91504 85214",
  phoneHref: "tel:+919150485214",
  email: "meenaannamalai27@gmail.com",
  emailHref: "mailto:meenaannamalai27@gmail.com",
  addressShort: "Krishna Swamy St, Lakshmi Nagar, Chromepet",
  addressFull: "Krishna Swamy St, Lakshmi Nagar, Ganapathipuram, Chromepet, Tambaram, Tamil Nadu 600044",
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Dynamic%20Donalds%2C%20Krishna%20Swamy%20St%2C%20Lakshmi%20Nagar%2C%20Ganapathipuram%2C%20Chromepet%2C%20Tambaram%2C%20Tamil%20Nadu%20600044",
  rating: "4.9",
  /** Review counts on the live listings (client, Nov 2026). Update as they grow. */
  googleReviewsCount: "98",
  justdialReviewsCount: "102",
  familiesCount: "1,000+",
  officeHours: [
    { day: "Monday – Friday", hours: "4:00 PM – 8:30 PM" },
    { day: "Saturday", hours: "9:00 AM – 1:00 PM" },
    { day: "Sunday", hours: "Closed" },
  ],
} as const;

export const navLinks = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/courses", key: "courses" },
  { href: "/about-tutors", key: "tutors" },
  { href: "/achievements", key: "achievements" },
  { href: "/gallery", key: "gallery" },
  { href: "/alumni", key: "alumni" },
  { href: "/contact", key: "contact" },
] as const;

export type NavKey = (typeof navLinks)[number]["key"];
