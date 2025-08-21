import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Prevent re-initialization of Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export async function GET() {
  try {
    // Count total users
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Count total tests
    let totalTests = 0;
    for (const userDoc of usersSnapshot.docs) {
      const testsSnapshot = await db.collection(`users/${userDoc.id}/tests`).get();
      totalTests += testsSnapshot.size;
    }

    return NextResponse.json({ totalUsers, totalTests });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
