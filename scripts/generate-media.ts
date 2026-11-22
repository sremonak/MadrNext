/**
 * Generates sample course media for local/dev:
 *  - HLS videos:  bash scripts/dev/gen-media.sh  (needs ffmpeg)
 *  - PDF notes:   this script (pdf-lib + Hind Siliguri)
 *
 * Run: npm run media:generate
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import "regenerator-runtime/runtime.js";
import { readFileSync } from "node:fs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const STORAGE_DIR = path.join(process.cwd(), process.env.STORAGE_DIR ?? "./storage");

function generateVideos() {
  const sh = path.join(process.cwd(), "scripts/dev/gen-media.sh");
  try {
    execFileSync("bash", [sh], { stdio: "inherit", env: process.env });
  } catch (e) {
    console.warn("Video generation skipped (ffmpeg unavailable). Run it manually later.", e);
  }
}

async function generatePdf(outPath: string, title: string, blocks: string[]) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(readFileSync(path.join(process.cwd(), "src/fonts/HindSiliguri-Regular.ttf")));
  const bold = await pdf.embedFont(readFileSync(path.join(process.cwd(), "src/fonts/HindSiliguri-Bold.ttf")));

  const page = pdf.addPage([595, 842]);
  // header band
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: rgb(0.055, 0.165, 0.17) });
  page.drawText("MadrNext", { x: 40, y: 780, size: 22, font: bold, color: rgb(1, 0.99, 0.95) });
  page.drawText("কোর্স নোট — ব্যক্তিগত ব্যবহারের জন্য", { x: 40, y: 756, size: 11, font, color: rgb(0.85, 0.75, 0.5) });

  page.drawText(title, { x: 40, y: 700, size: 18, font: bold, color: rgb(0.08, 0.2, 0.2) });

  let y = 668;
  for (const block of blocks) {
    // naive wrap by words at ~90 chars
    const words = block.split(" ");
    let line = "";
    for (const w of words) {
      if ((line + " " + w).length > 84) {
        page.drawText(line, { x: 40, y, size: 12, font, color: rgb(0.15, 0.2, 0.2) });
        y -= 19;
        line = w;
      } else {
        line = line ? `${line} ${w}` : w;
      }
    }
    if (line) {
      page.drawText(line, { x: 40, y, size: 12, font, color: rgb(0.15, 0.2, 0.2) });
      y -= 19;
    }
    y -= 10;
    if (y < 60) break;
  }

  page.drawText("এই নোট MadrNext এনরোলমেন্ট যাচাইকৃত শিক্ষার্থীর জন্য। স্বত্ব সংরক্ষিত।", {
    x: 40, y: 36, size: 9.5, font, color: rgb(0.45, 0.5, 0.48),
  });
  const bytes = await pdf.save();
  await import("node:fs/promises").then((fs) => fs.writeFile(outPath, bytes));
  console.log("→", path.relative(process.cwd(), outPath));
}

async function generatePdfs() {
  const dir = path.join(STORAGE_DIR, "documents");
  mkdirSync(dir, { recursive: true });
  await generatePdf(path.join(dir, "sample-1.pdf"), "তাজবীদ ভিত্তি: মাখরাজ ও লাহন", [
    "মাখরাজ হলো অক্ষর উচ্চারণের স্থান। আরবি বর্ণমালায় ১৭টি প্রসিদ্ধ মাখরাজ রয়েছে, যা পাঁচটি প্রধান অঞ্চলে বিভক্ত: জাওফ (গলার খালি অংশ), হালক (গলা), লিসান (জিভা), শাফাতান (দুই ঠোঁট) এবং খাইশুম (নাক)।",
    "লাহন অর্থ সুর। তিন প্রকার লাহন আবশ্যক বা লাজিম: রাফ (উচ্চ সুর), হাযব (নিচু সুর) এবং কাইয (সমান সুর)। এগুলো অপঠনযোগ্য ভুলের শ্রেণিতে পড়ে, তাই প্রতিটি শিক্ষার্থীকে অবশ্যই মেনে চলতে হয়।",
    "পরীক্ষার টিপ: বোর্ড প্রশ্নে প্রায়ই জিজ্ঞেস করা হয় — কোন বর্ণ কোন মাখরাজ থেকে উচ্চারিত। নিচের টেবিল মুখস্থ করুন: ব, ম, ওয়াও — শাফাতান; ক, ক্বাফ — লিসানের গভীর অংশ।",
    "প্র্যাকটিস নির্দেশনা: প্রতিদিন ১০ মিনিট কুরআন তিলাওয়াত করে মাখরাজ যাচাই করুন। কোন অক্ষরে ভুল হলে সেই অক্ষরের প্র্যাকটিস ৫ বার পুনরাবৃত্তি করুন।",
  ]);
  await generatePdf(path.join(dir, "sample-2.pdf"), "দ্বিঘাত সমীকরণ: সূত্র পদ্ধতি", [
    "ax² + bx + c = 0 আকারের সমীকরণকে দ্বিঘাত সমীকরণ বলে, যেখানে a ≠ 0। সমাধানের সূত্র: x = (−b ± √(b² − 4ac)) / 2a।",
    "নির্ণায়ক (discriminant) D = b² − 4ac। D > 0 হলে দুটি ভিন্ন বাস্তব মূল, D = 0 হলে একটি মূল (দুই মূল সমান), আর D < 0 হলে বাস্তব মূল নেই।",
    "উদাহরণ: x² − 5x + 6 = 0। এখানে a=1, b=−5, c=6। D = 25 − 24 = 1। সুতরাং x = (5 ± 1)/2 → x = 3 বা x = 2।",
    "বোর্ড পরীক্ষার কমন ভুল: b-এর চিহ্ন পরিবর্তন করতে ভুল করা এবং 2a দিয়ে ভাগ না করা। প্রতিটি ধাপ খাতায় লিখে প্র্যাকটিস করুন।",
  ]);
  await generatePdf(path.join(dir, "sample-3.pdf"), "হাদিস শিক্ষা: নিয়ত ও আমল", [
    "প্রসিদ্ধ হাদিস: ইন্নামাল আমালু বিন্নিয়াত — সব আমল নিয়তের উপর নির্ভরশীল (বুখারি ও মুসলিম)।",
    "শিক্ষা: বাহ্যিক আমল কত বড়ই হোক, প্রকৃত মূল্য অন্তরের নিয়ত দ্বারা নির্ধারিত হয়। জ্ঞান অর্জনের নিয়ত হবে আল্লাহর সন্তুষ্টি অর্জন।",
    "পরীক্ষা-প্রস্তুতি: হাদিসের আরবি মূলপাঠ, বাংলা অনুবাদ, সনদ ও বর্ণনাকারী এবং শিক্ষা-মূল্যায়ন — এই চারটি পয়েন্ট আলাদা করে নোট করুন।",
  ]);
}

async function main() {
  if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });
  generateVideos();
  await generatePdfs();
  console.log("Media generation complete ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
