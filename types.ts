export interface WordItem {
  en: string;
  vn: string;
}

export interface Topic {
  id: string;
  name: string;
  words: WordItem[];
}

export interface UserProgress {
  learnedWords: string[]; // List of English words marked as learned
  quizScores: { [topicId: string]: number }; // Last score per topic
  dailyGoal: number;
  streak: number;
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LEARN = 'LEARN',
  FLASHCARD = 'FLASHCARD',
  QUIZ = 'QUIZ'
}

export interface PronunciationResult {
  score: number;
  feedback: string;
}

export interface QuizQuestion {
  word: string;
  correctMeaning: string;
  options: string[];
}