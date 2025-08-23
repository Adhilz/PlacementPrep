import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Recalculate and update the user's stats.totalScore in Firestore
 * Sums all aptitude, coding, and group discussion (gd) scores from the user's history
 * @param uid User's Firestore UID
 */
export async function recalculateAndUpdateTotalScore(uid: string) {
  if (!uid) return;
  const userDocRef = doc(db, "users", uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return;
  const data = userDoc.data();
  const history = Array.isArray(data.history) ? data.history : [];
  let total = 0;
  let gdCount = 0;
  history.forEach((h) => {
    if (
      (h.type === "aptitude" || h.type === "coding" || h.type === "gd" || h.type === "group-discussion") &&
      typeof h.score === "number"
    ) {
      total += h.score;
    }
    if (h.type === "gd" || h.type === "group-discussion") {
      gdCount += 1;
    }
  });
  await updateDoc(userDocRef, { "stats.totalScore": total, "stats.gdCount": gdCount });
}