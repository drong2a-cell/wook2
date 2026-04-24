/**
 * Anniversary notification scheduler
 * Runs daily to check and send notifications for anniversaries
 */
import { getAnniversaries, getCouplePairByUserId, getUserById, markAnniversaryNotified } from "./db";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { couplePairs } from "../drizzle/schema";

async function checkAndNotifyAnniversaries() {
  const db = await getDb();
  if (!db) return;

  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  try {
    // Get all couple pairs
    const pairs = await db.select().from(couplePairs);

    for (const pair of pairs) {
      const anniversaries = await getAnniversaries(pair.id);

      for (const ann of anniversaries) {
        const annDate = new Date(ann.date);
        const annMonth = annDate.getMonth();
        const annDay = annDate.getDate();

        const isToday = annMonth === todayMonth && annDay === todayDay;
        const isThisYear = annDate.getFullYear() === today.getFullYear();

        // Check if it's today (for yearly repeating or exact date)
        if (isToday && (ann.repeatYearly || isThisYear) && !ann.notified) {
          console.log(`[Anniversary] Notifying for: ${ann.title} (pair ${pair.id})`);

          // Send notification to owner (in production, would send to both users)
          await notifyOwner({
            title: `🎉 기념일 알림: ${ann.title}`,
            content: `오늘은 "${ann.title}" 기념일이에요! 소중한 사람과 함께 축하하세요 💕`,
          });

          // Mark as notified (reset yearly on Jan 1)
          if (!ann.repeatYearly) {
            await markAnniversaryNotified(ann.id);
          }
        }
      }
    }
  } catch (error) {
    console.error("[Anniversary Scheduler] Error:", error);
  }
}

// Schedule daily check at 9 AM
export function startAnniversaryScheduler() {
  console.log("[Anniversary Scheduler] Starting...");

  // Run immediately on start (for testing)
  checkAndNotifyAnniversaries();

  // Run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;
  setInterval(checkAndNotifyAnniversaries, INTERVAL);
}
