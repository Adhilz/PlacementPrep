"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Code, Play, CheckCircle, Clock, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { HistoryDropdown } from "@/components/history-dropdown"

interface CodingProblem {
  id: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  description: string
  examples: Array<{
    input: string
    output: string
    explanation?: string
  }>
  constraints: string[]
  points: number
  timeLimit: string
  memoryLimit: string
}

interface Solution {
  id: string
  problemId: string
  code: string
  language: string
  submittedAt: string
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error"
  runtime?: string
  memory?: string
}

// Fallback sample problems if API fails
const sampleProblems: CodingProblem[] = [
  {
    id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists.",
    ],
    points: 100,
    timeLimit: "1s",
    memoryLimit: "256MB",
  },
  {
    id: "2",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.",
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
    ],
    constraints: ["1 ≤ s.length ≤ 10⁴", "s consists of parentheses only '()[]{}'."],
    points: 120,
    timeLimit: "1s",
    memoryLimit: "256MB",
  },
  {
    id: "3",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "String",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1.',
      },
    ],
    constraints: ["0 ≤ s.length ≤ 5 * 10⁴", "s consists of English letters, digits, symbols and spaces."],
    points: 200,
    timeLimit: "2s",
    memoryLimit: "256MB",
  },
  {
    id: "4",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    category: "Linked List",
    description:
      "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists.",
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
      },
      {
        input: "list1 = [], list2 = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 ≤ Node.val ≤ 100",
      "Both list1 and list2 are sorted in non-decreasing order.",
    ],
    points: 150,
    timeLimit: "1s",
    memoryLimit: "256MB",
  },
  {
    id: "5",
    title: "Maximum Subarray",
    difficulty: "Medium",
    category: "Dynamic Programming",
    description:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "[4,-1,2,1 has the largest sum = 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
    ],
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    points: 250,
    timeLimit: "2s",
    memoryLimit: "256MB",
  },
]

interface CodingChallengeProps {
  onBack: () => void
}


export function CodingChallenge({ onBack }: CodingChallengeProps) {
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [activeTab, setActiveTab] = useState("problems")
  const [submissionResult, setSubmissionResult] = useState<{
    status: string
    runtime?: string
    memory?: string
    message?: string
  } | null>(null)
  const { userProfile, updateStats, addToHistory, updateUserProfile } = useAuth()
  const [completedProblems, setCompletedProblems] = useState<string[]>(userProfile?.completedCodingChallenges || []);
  const [solutions, setSolutions] = useState<Solution[]>(userProfile?.solutions || []);
  const [problems, setProblems] = useState<CodingProblem[]>(sampleProblems);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.completedCodingChallenges) {
      setCompletedProblems(userProfile.completedCodingChallenges);
    }
    if (userProfile?.solutions) {
      setSolutions(userProfile.solutions);
    }
  }, [userProfile?.completedCodingChallenges, userProfile?.solutions]);

  // Fetch 5 random coding challenges from local API route (LeetCode), fallback to static if needed
  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leetcode-daily");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (Array.isArray(json.problems) && json.problems.length > 0) {
          setProblems(json.problems);
        } else {
          setProblems(sampleProblems);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch problems");
        setProblems(sampleProblems);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
  ];

  const getDefaultCode = (lang: string) => {
    switch (lang) {
      case "javascript":
        return `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
  // Your solution here
};`;
      case "python":
        return `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Your solution here\n        pass`;
      case "java":
        return `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n    }\n}`;
      case "cpp":
        return `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n    }\n};`;
      case "c":
        return `#include <stdio.h>\n\n// Write your C solution here\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Your solution here\n    return NULL;\n}`;
      default:
        return "";
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(getDefaultCode(newLanguage));
  };

  // Only simulate result, do not call any API or show output
  const handleSubmit = async () => {
    if (!selectedProblem || !code.trim()) return;
    // Simulate submission result
    const results = ["Accepted", "Wrong Answer", "Time Limit Exceeded"];
    const randomResult = results[Math.floor(Math.random() * results.length)];

    const newSolution: Solution = {
      id: Date.now().toString(),
      problemId: selectedProblem.id,
      code,
      language,
      submittedAt: new Date().toISOString(),
      status: randomResult as Solution["status"],
      runtime: randomResult === "Accepted" ? `${Math.floor(Math.random() * 100) + 50}ms` : undefined,
      memory: randomResult === "Accepted" ? `${Math.floor(Math.random() * 20) + 40}MB` : undefined,
    };

    const updatedSolutions = [newSolution, ...solutions];
    setSolutions(updatedSolutions);

    if (randomResult === "Accepted") {
      const updatedCompletedProblems = [...completedProblems, selectedProblem.id];

      addToHistory({
        type: "coding",
        title: `${selectedProblem.title} - ${selectedProblem.difficulty}`,
        score: selectedProblem.points,
        details: {
          language: language,
          runtime: newSolution.runtime,
          memory: newSolution.memory,
          difficulty: selectedProblem.difficulty,
          category: selectedProblem.category,
        },
      });

      updateStats({
        codingChallengesCompleted: 1,
        totalScore: selectedProblem.points,
      });

      if (userProfile && updateUserProfile) {
        await updateUserProfile({
          completedCodingChallenges: updatedCompletedProblems,
          solutions: updatedSolutions,
        });
        setCompletedProblems(updatedCompletedProblems);
      }
      console.log(
        `[v0] Coding challenge completed - Problem: ${selectedProblem.title}, Points: ${selectedProblem.points}`,
      );
    }

    setSubmissionResult({
      status: randomResult,
      runtime: newSolution.runtime,
      memory: newSolution.memory,
      message:
        randomResult === "Accepted"
          ? "Great job! Your solution passed all test cases."
          : randomResult === "Wrong Answer"
            ? "Your solution failed some test cases. Check your logic."
            : "Your solution exceeded the time limit. Try optimizing your algorithm.",
    });
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700"
      case "Medium":
        return "bg-yellow-100 text-yellow-700"
      case "Hard":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
        return "text-green-600"
      case "Wrong Answer":
        return "text-red-600"
      case "Time Limit Exceeded":
        return "text-orange-600"
      case "Runtime Error":
        return "text-purple-600"
      default:
        return "text-gray-600"
    }
  }

  const isProblemSolved = (problemId: string) =>
    completedProblems.includes(problemId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-lg">Loading coding challenges...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-lg text-red-600">{error}</span>
      </div>
    );
  }

  if (selectedProblem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={() => setSelectedProblem(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Problems
            </Button>
            <div className="flex items-center space-x-4">
              <HistoryDropdown currentPageName="Coding Challenge" />
              <Badge className={getDifficultyColor(selectedProblem.difficulty)}>{selectedProblem.difficulty}</Badge>
              <Badge variant="secondary">{selectedProblem.category}</Badge>
              <div className="flex items-center space-x-1 text-sm">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>{selectedProblem.points} pts</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Problem Description */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>{selectedProblem.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm leading-relaxed">{selectedProblem.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Examples</h3>
                  <div className="space-y-3">
                    {selectedProblem.examples.map((example, index) => (
                      <div key={index} className="bg-muted p-3 rounded text-sm">
                        <div>
                          <strong>Input:</strong> {example.input}
                        </div>
                        <div>
                          <strong>Output:</strong> {example.output}
                        </div>
                        {example.explanation && (
                          <div>
                            <strong>Explanation:</strong> {example.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Constraints</h3>
                  <ul className="text-sm space-y-1">
                    {selectedProblem.constraints.map((constraint, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Time: {selectedProblem.timeLimit}</span>
                  </div>
                  <div>Memory: {selectedProblem.memoryLimit}</div>
                </div>
              </CardContent>
            </Card>

            {/* Code Editor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Solution</CardTitle>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Write your solution here..."
                  className="font-mono text-sm min-h-[400px]"
                />
                <div className="flex space-x-2">
                  <Button onClick={handleSubmit} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Submit Solution
                  </Button>
                  <Button variant="outline" onClick={() => setCode(getDefaultCode(language))}>
                    Reset
                  </Button>
                </div>
                {/* Submission Result */}
                {submissionResult && (
                  <Card
                    className={`border-l-4 ${
                      submissionResult.status === "Accepted" ? "border-l-green-500" : "border-l-red-500"
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${getStatusColor(submissionResult.status)}`}>
                          {submissionResult.status}
                        </span>
                        {submissionResult.status === "Accepted" && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{submissionResult.message}</p>
                      {submissionResult.runtime && (
                        <div className="flex space-x-4 text-sm">
                          <span>Runtime: {submissionResult.runtime}</span>
                          <span>Memory: {submissionResult.memory}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-4">
            <HistoryDropdown currentPageName="Coding Challenge" />
            <div className="flex items-center space-x-2">
              <Code className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Coding Challenges</h1>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="problems">Problems ({problems.length})</TabsTrigger>
            <TabsTrigger value="submissions">My Submissions ({solutions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="problems" className="space-y-4">
            <div className="grid gap-4">
              {problems.map((problem) => {
                const solved = isProblemSolved(problem.id);
                return (
                  <Card
                    key={problem.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => !solved && setSelectedProblem(problem)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CardTitle className="text-lg">{problem.title}</CardTitle>
                          <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
                          <Badge variant="secondary">{problem.category}</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-sm">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span>{problem.points}</span>
                          </div>
                          {solved && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 font-semibold text-xs">
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">{problem.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Time: {problem.timeLimit}</span>
                          <span>Memory: {problem.memoryLimit}</span>
                        </div>
                        {/* No button if solved */}
                        {!solved && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProblem(problem)
                              setCode(getDefaultCode(language))
                            }}
                          >
                            Solve Challenge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            {solutions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Submissions Yet</h3>
                  <p className="text-muted-foreground mb-4">Start solving problems to see your submission history</p>
                  <Button onClick={() => setActiveTab("problems")}>Browse Problems</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Show all solutions, not just accepted ones */}
                {solutions.map((solution) => {
                  const problem = problems.find((p) => p.id === solution.problemId)
                  return (
                    <Card key={solution.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CardTitle className="text-base">{problem?.title}</CardTitle>
                            <Badge variant="secondary">{solution.language}</Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${getStatusColor(solution.status)}`}>
                              {solution.status}
                            </span>
                            {solution.status === "Accepted" && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        </div>
                        <CardDescription>Submitted {new Date(solution.submittedAt).toLocaleString()}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {solution.runtime && (
                          <div className="flex space-x-4 text-sm text-muted-foreground mb-3">
                            <span>Runtime: {solution.runtime}</span>
                            <span>Memory: {solution.memory}</span>
                          </div>
                        )}
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium mb-2">View Code</summary>
                          <pre className="bg-muted p-3 rounded overflow-x-auto">
                            <code>{solution.code}</code>
                          </pre>
                        </details>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}