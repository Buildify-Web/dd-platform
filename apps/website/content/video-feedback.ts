/**
 * Student video feedback, shown on the Alumni & Feedback page ("Student's feedback").
 * Content is a summary of what each student says in their video (client summaries, Nov 2026).
 * Points are written as short third-person summaries, not as direct quotes.
 *
 * HOW TO ADD A VIDEO
 * 1. Put the file in:  apps/website/public/videos/feedback/
 *    Name it to match the `video` path, e.g. feedback-06.mp4
 *    - Format: MP4 (H.264 video + AAC audio). Portrait (9:16) looks best.
 *    - Keep each file small: 720p, about 2–6 MB for a 30–60 s clip.
 *      (ffmpeg -i in.mov -vf "scale=-2:1280" -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 96k -movflags +faststart feedback-06.mp4)
 * 2. Optional poster (still shown before the video loads): feedback-06.jpg in the same folder,
 *    then set `poster: "/videos/feedback/feedback-06.jpg"`.
 * 3. Add an entry below: the student's name, one highlight line, and 2–4 key points.
 *
 * A missing file shows a clean "Video coming soon" slide (and, in dev only, the expected path).
 */

export type VideoFeedback = {
  id: string;
  /** path under /public, e.g. "/videos/feedback/feedback-01.mp4" */
  video: string;
  /** optional still image shown before the video loads */
  poster?: string;
  student: string;
  /** one short line that sums up the video — the big text beside it */
  headline: string;
  /** 2–4 key points from the video, one sentence each */
  points: string[];
  /** 1–5, defaults to 5 */
  rating?: number;
};

export const videoFeedback: VideoFeedback[] = [
  {
    id: "feedback-01",
    video: "/videos/feedback/feedback-01.mp4",
    student: "Darshana",
    headline: "Loves every teacher at DD, especially Meena ma’am",
    points: [
      "Enjoys Spoken English with Meena ma’am, and the whole class loves English.",
      "The online spoken English classes have helped her a lot.",
      "Likes Dynamic Donalds and every one of its teachers.",
    ],
  },
  {
    id: "feedback-02",
    video: "/videos/feedback/feedback-02.mp4",
    student: "Madhumitha",
    headline: "Proud to be a student at Dynamic Donalds",
    points: [
      "Learns Mathematics at Dynamic Donalds.",
      "Likes the unique teaching style each teacher brings.",
      "Believes every teacher is the backbone of our society.",
    ],
  },
  {
    id: "feedback-03",
    video: "/videos/feedback/feedback-03.mp4",
    student: "Nitesh Aravind",
    headline: "Learning made interactive, fun and easy",
    points: [
      "Kowsalya ma’am makes Maths interactive, fun and easy to follow.",
      "Business Studies, Accountancy and Economics are taught in a way that is easy to understand.",
      "Thenu sir is a calm and composed teacher.",
    ],
  },
  {
    id: "feedback-04",
    video: "/videos/feedback/feedback-04.mp4",
    student: "Thanishya",
    headline: "Confident in Maths within just 1.5 months",
    points: [
      "Joined only 1.5 months ago and already feels comfortable with Maths.",
      "Kowsalya ma’am explains simply and gives extra problems for practice.",
      "Science is taught practically, keeping students involved in every topic.",
    ],
  },
  {
    id: "feedback-05",
    video: "/videos/feedback/feedback-05.mp4",
    student: "Rajitha",
    headline: "More disciplined, with a deeper understanding",
    points: [
      "Has become much more disciplined since joining.",
      "Her Maths teacher gives enough time for every doubt and goes deep into each topic.",
      "Science comes with good lecture videos, and Physics is taught practically.",
    ],
  },
];
