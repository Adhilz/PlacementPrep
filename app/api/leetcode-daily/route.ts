
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';


  export async function GET() {
    try {
      // Get today's date string (YYYY-MM-DD)
      const today = new Date().toISOString().slice(0, 10);

      // Firestore: Check if today's questions exist
      const dailyDocRef = doc(collection(db, 'dailyQuestions'), today);
      const dailyDocSnap = await getDoc(dailyDocRef);
      if (dailyDocSnap.exists()) {
        const data = dailyDocSnap.data();
        if (data && data.problems) {
          return new Response(JSON.stringify({ problems: data.problems }), { status: 200 });
        }
      }
  // Step 1: Fetch a list of questions using the provided query and variables
      const listQuery = `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
          problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
            total: totalNum
            questions: data {
              acRate
              difficulty
              title
              titleSlug
              topicTags { name id slug }
            }
          }
        }
      `;
      // Use a random skip value to get a different window of questions each time
      const maxSkip = 1900; // LeetCode has thousands of questions, adjust as needed
      const variables = {
        categorySlug: "",
        skip: Math.floor(Math.random() * maxSkip),
        limit: 300,
        filters: {}
      };
      const listRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: listQuery, variables }),
      });
      let listData = null;
      try {
        listData = await listRes.json();
      } catch (jsonErr) {
        console.error('[LeetCode API] Failed to parse JSON:', jsonErr);
        return new Response(JSON.stringify({ error: 'Invalid JSON from LeetCode' }), { status: 502 });
      }
      if (!listRes.ok || !listData) {
        console.error('[LeetCode API] Bad response:', listRes.status, listData);
        return new Response(JSON.stringify({ error: 'Failed to fetch from LeetCode', details: listData }), { status: listRes.status || 502 });
      }
      const questions = listData.data?.problemsetQuestionList?.questions || [];
      // Group by difficulty (LeetCode returns 'Easy', 'Medium', 'Hard')
      const easy = questions.filter((q: any) => q.difficulty === 'Easy');
      const medium = questions.filter((q: any) => q.difficulty === 'Medium');
      const hard = questions.filter((q: any) => q.difficulty === 'Hard');

      // Helper to pick N random unique items, with retry if detail fetch fails
      async function pickWithDetails(arr: any[], n: number) {
        const picked: any[] = [];
        const used = new Set();
        while (picked.length < n && used.size < arr.length) {
          const idx = Math.floor(Math.random() * arr.length);
          if (used.has(idx)) continue;
          used.add(idx);
          const q = arr[idx];
          // Fetch details
          const detailQuery = `
            query questionData($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                questionId
                questionFrontendId
                title
                titleSlug
                difficulty
                categoryTitle
                content
                exampleTestcases
                metaData
              }
            }
          `;
          const detailVars = { titleSlug: q.titleSlug };
          try {
            const detailRes = await fetch('https://leetcode.com/graphql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: detailQuery, variables: detailVars }),
            });
            const detailData = await detailRes.json();
            const dq = detailData.data?.question;
            if (!dq) continue;
            const meta = dq.metaData ? JSON.parse(dq.metaData) : {};
            const examples = dq.exampleTestcases
              ? dq.exampleTestcases.split('\n').map((ex: string) => ({ input: ex, output: '', explanation: '' }))
              : [];
            picked.push({
              id: dq.questionId || dq.questionFrontendId,
              title: dq.title,
              difficulty: dq.difficulty,
              category: dq.categoryTitle || '',
              description: dq.content?.replace(/<[^>]+>/g, '') || '',
              examples,
              constraints: meta.constraints || [],
              points: dq.difficulty === 'Hard' ? 250 : dq.difficulty === 'Medium' ? 150 : 100,
              timeLimit: meta.timeLimit || '1s',
              memoryLimit: meta.memoryLimit || '256MB',
            });
          } catch (err) {
            continue;
          }
        }
        return picked;
      }

      // Try to get 2 easy, 2 medium, 1 hard with valid details
      const problems: any[] = [];
      problems.push(...(await pickWithDetails(easy, 2)));
      problems.push(...(await pickWithDetails(medium, 2)));
      problems.push(...(await pickWithDetails(hard, 1)));

      // If we still have less than 5, fill from any remaining
      if (problems.length < 5) {
        const all = [...easy, ...medium, ...hard];
        const more = await pickWithDetails(all, 5 - problems.length);
        problems.push(...more);
      }


  // Store today's problems in Firestore
  await setDoc(dailyDocRef, { problems, date: today });

      // Step 2: For each selected, fetch full details (now handled above)
      return new Response(JSON.stringify({ problems }), { status: 200 });
    } catch (error: any) {
      console.error('[LeetCode API] Exception:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
  }
}