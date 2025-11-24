import React, { useState, useEffect } from 'react';
import { WordItem } from '../types';

interface QuizProps {
  words: WordItem[];
  onFinish: (score: number) => void;
}

interface Question {
  questionWord: string;
  correctAnswer: string;
  options: string[];
}

const Quiz: React.FC<QuizProps> = ({ words, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Generate simple questions based on the 10 words
    if (words.length === 0) return;

    const generated = words.map((word) => {
      // Pick 3 random wrong answers from other words
      const others = words.filter(w => w.en !== word.en);
      const wrong = others.sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.vn);
      const options = [...wrong, word.vn].sort(() => 0.5 - Math.random());
      
      return {
        questionWord: word.en,
        correctAnswer: word.vn,
        options
      };
    });

    setQuestions(generated);
  }, [words]);

  const handleAnswer = (option: string) => {
    if (selectedOption) return; // Prevent double click
    setSelectedOption(option);

    if (option === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setIsFinished(true);
        onFinish(score + (option === questions[currentIndex].correctAnswer ? 1 : 0));
      }
    }, 1000);
  };

  if (questions.length === 0) return <div>Generating quiz...</div>;

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-primary mb-4">Quiz Completed!</h2>
        <p className="text-gray-600 mb-6">You scored</p>
        <div className="text-6xl font-bold text-secondary mb-6">{score} / {questions.length}</div>
        <button 
          onClick={() => onFinish(score)}
          className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-teal-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-6 flex justify-between items-center text-gray-500 text-sm">
        <span>Question {currentIndex + 1}/{questions.length}</span>
        <span>Score: {score}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center mb-8">
        <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-2">Translate this word</p>
        <h2 className="text-4xl font-bold text-gray-800">{currentQ.questionWord}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQ.options.map((option, idx) => {
          let bgClass = "bg-white hover:bg-gray-50 border-gray-200";
          if (selectedOption) {
            if (option === currentQ.correctAnswer) bgClass = "bg-green-100 border-green-500 text-green-800";
            else if (option === selectedOption) bgClass = "bg-red-100 border-red-500 text-red-800";
            else bgClass = "bg-gray-50 opacity-50";
          }
          
          return (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedOption}
              className={`p-4 rounded-xl border-2 font-medium text-lg transition-all ${bgClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Quiz;