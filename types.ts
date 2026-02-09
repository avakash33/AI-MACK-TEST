
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hint?: string;
}

export interface TestResult {
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  answers: Record<string, number>;
  timestamp: number;
  anomalies: number; // For "auto-detection" focus loss
  categoryBreakdown: Record<string, { correct: number; total: number }>;
}

export enum AppState {
  IDLE = 'IDLE',
  ABOUT = 'ABOUT',
  CONFIGURING = 'CONFIGURING',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  TESTING = 'TESTING',
  COMPLETED = 'COMPLETED'
}

export interface TestConfig {
  title: string;
  duration: number; // in minutes
  questionCount: number;
  topics: string; // Specific topics to focus on
}
