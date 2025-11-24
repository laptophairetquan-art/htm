import React, { useState } from 'react';
import { WordItem } from '../types';

interface FlashcardProps {
  word: WordItem;
  onNext: () => void;
  onPrev: () => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ word, onNext, onPrev }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);

  // Reset flip state when word changes
  React.useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word.en);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4">
      <div 
        className="relative w-full h-80 cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white border-2 border-primary/20 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8">
            <span className="text-sm uppercase tracking-widest text-gray-400 mb-4">Word</span>
            <h2 className="text-4xl font-bold text-gray-800 text-center">{word.en}</h2>
            <button 
              onClick={speak}
              className="mt-6 p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </button>
            <p className="absolute bottom-4 text-xs text-gray-400">Tap to flip</p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-primary/90 text-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8">
             <span className="text-sm uppercase tracking-widest text-teal-200 mb-4">Meaning</span>
             <h2 className="text-3xl font-bold text-center">{word.vn}</h2>
          </div>

        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button 
          onClick={onPrev}
          className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
        >
          Previous
        </button>
        <button 
          onClick={onNext}
          className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-teal-700 shadow-lg"
        >
          Next Card
        </button>
      </div>
    </div>
  );
};

export default Flashcard;