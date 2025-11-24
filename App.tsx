import React, { useState, useEffect, useRef } from 'react';
import { VOCABULARY_DATA } from './data';
import { Topic, WordItem, AppMode, UserProgress } from './types';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import { checkPronunciation } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

// --- Icons ---
const BookIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const CardIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const QuizIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MicIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const HomeIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CheckCircleIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

function App() {
  const [activeTopic, setActiveTopic] = useState<Topic>(VOCABULARY_DATA[0]);
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.LEARN);
  const [dailyWords, setDailyWords] = useState<WordItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{score: number, feedback: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Progress State with Persistence
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('taec_user_progress');
    return saved ? JSON.parse(saved) : {
      learnedWords: [],
      quizScores: {},
      dailyGoal: 10,
      streak: 1
    };
  });

  // Save progress whenever it changes
  useEffect(() => {
    localStorage.setItem('taec_user_progress', JSON.stringify(progress));
  }, [progress]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize Daily Words
  useEffect(() => {
    // In a real app, this would check the date and rotate words. 
    // For demo, we take the first 10 words of the selected topic.
    setDailyWords(activeTopic.words.slice(0, 10));
    setAiFeedback(null);
    setSelectedWord(null);
  }, [activeTopic]);

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAiFeedback(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for pronunciation practice.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    if (!selectedWord) return;
    setIsAnalyzing(true);
    
    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      
      const result = await checkPronunciation(base64Content, selectedWord.en);
      setAiFeedback(result);
      setIsAnalyzing(false);
    };
  };

  const toggleLearned = (word: string) => {
    const isLearned = progress.learnedWords.includes(word);
    let newLearnedWords;
    if (isLearned) {
      newLearnedWords = progress.learnedWords.filter(w => w !== word);
    } else {
      newLearnedWords = [...progress.learnedWords, word];
    }
    setProgress(p => ({ ...p, learnedWords: newLearnedWords }));
  };

  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const renderDashboard = () => {
    const chartData = VOCABULARY_DATA.map(topic => ({
        name: topic.name.split('.')[1].replace('Chủ đề ', '').trim(),
        learned: topic.words.filter(w => progress.learnedWords.includes(w.en)).length,
        total: topic.words.length
    }));

    const totalLearned = progress.learnedWords.length;
    const totalWords = VOCABULARY_DATA.reduce((acc, t) => acc + t.words.length, 0);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-20">
            <h2 className="text-3xl font-bold text-gray-800">Your Progress Dashboard</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Learned</p>
                    <div className="mt-4">
                        <span className="text-4xl font-bold text-primary">{totalLearned}</span>
                        <span className="text-lg text-gray-400 ml-2">/ {totalWords} words</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
                        <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${(totalLearned / totalWords) * 100}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Current Streak</p>
                    <div className="mt-4 flex items-baseline">
                        <span className="text-4xl font-bold text-secondary">{progress.streak}</span>
                        <span className="text-lg text-gray-400 ml-2">days</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-4">Keep it up!</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Daily Goal</p>
                    <div className="mt-4">
                         {/* Simple calculation for demo: counting any learned word as daily progress */}
                        <span className="text-4xl font-bold text-accent">{Math.min(10, totalLearned)}</span>
                        <span className="text-lg text-gray-400 ml-2">/ 10 words</span>
                    </div>
                     <p className="text-sm text-green-600 mt-4 font-medium">
                        {Math.min(10, totalLearned) >= 10 ? 'Goal Reached! 🎉' : 'Keep learning!'}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                <h3 className="text-lg font-bold text-gray-700 mb-6">Learning by Topic</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                        <Tooltip 
                            cursor={{fill: '#F3F4F6'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="learned" stackId="a" fill="#0F766E" radius={[0, 0, 4, 4]} barSize={32} />
                        <Bar dataKey="total" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.DASHBOARD:
        return renderDashboard();
      case AppMode.FLASHCARD:
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <Flashcard 
                    word={dailyWords[currentCardIndex]} 
                    onNext={() => setCurrentCardIndex((p) => (p + 1) % dailyWords.length)}
                    onPrev={() => setCurrentCardIndex((p) => (p - 1 + dailyWords.length) % dailyWords.length)}
                />
                <p className="mt-4 text-gray-500">{currentCardIndex + 1} / {dailyWords.length}</p>
            </div>
        );
      case AppMode.QUIZ:
        return (
            <div className="pt-10">
                <Quiz 
                    words={dailyWords} 
                    onFinish={(score) => {
                       const newScores = { ...progress.quizScores, [activeTopic.id]: score };
                       setProgress(p => ({ ...p, quizScores: newScores }));
                       alert(`Quiz finished! Score: ${score}`);
                       setActiveMode(AppMode.LEARN);
                    }} 
                />
            </div>
        );
      case AppMode.LEARN:
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Word List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px] lg:h-auto">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex justify-between items-center">
                <span>Vocabulary List</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{dailyWords.length} words</span>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {dailyWords.map((item, idx) => {
                  const isLearned = progress.learnedWords.includes(item.en);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedWord(item); setAiFeedback(null); }}
                      className={`w-full text-left p-4 rounded-xl transition-all flex justify-between items-center group relative
                        ${selectedWord?.en === item.en ? 'bg-primary text-white shadow-md' : 'hover:bg-gray-50 text-gray-800 border border-transparent hover:border-gray-200'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {isLearned && <div className={`w-2 h-2 rounded-full ${selectedWord?.en === item.en ? 'bg-green-300' : 'bg-green-500'}`}></div>}
                        <span className="font-medium text-lg">{item.en}</span>
                      </div>
                      <span className={`text-sm ${selectedWord?.en === item.en ? 'text-teal-100' : 'text-gray-400'}`}>{item.vn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail / Practice Area */}
            <div className="flex flex-col">
              {selectedWord ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden transition-all animate-fade-in">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent"></div>
                   
                   <div className="w-full flex justify-between items-start mb-2">
                     <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Practice</span>
                     <button 
                       onClick={() => toggleLearned(selectedWord.en)}
                       className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border transition-all
                         ${progress.learnedWords.includes(selectedWord.en) 
                           ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                           : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-400'
                         }`}
                     >
                       <CheckCircleIcon />
                       {progress.learnedWords.includes(selectedWord.en) ? 'Mastered' : 'Mark as Learned'}
                     </button>
                   </div>

                   <h2 className="text-5xl font-bold text-gray-900 mt-2 mb-2">{selectedWord.en}</h2>
                   <p className="text-xl text-gray-500 mb-8">{selectedWord.vn}</p>

                   <div className="flex gap-4 mb-8">
                     <button 
                       onClick={() => handleSpeak(selectedWord.en)}
                       className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                       Listen
                     </button>
                     <button 
                       onMouseDown={startRecording}
                       onMouseUp={stopRecording}
                       onTouchStart={startRecording}
                       onTouchEnd={stopRecording}
                       className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-lg
                         ${isRecording ? 'bg-red-500 text-white scale-105 ring-4 ring-red-200' : 'bg-primary text-white hover:bg-teal-700'}
                       `}
                     >
                       <MicIcon />
                       {isRecording ? 'Listening...' : 'Hold to Speak'}
                     </button>
                   </div>

                   {/* AI Feedback Area */}
                   <div className="w-full bg-gray-50 rounded-xl p-6 min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                     {isAnalyzing ? (
                       <div className="flex flex-col items-center gap-2">
                         <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-sm text-gray-500">Gemini is listening...</p>
                       </div>
                     ) : aiFeedback ? (
                       <div className="animate-fade-in w-full">
                         <div className="flex justify-center items-center gap-3 mb-3">
                           <div className={`text-4xl font-bold ${aiFeedback.score > 80 ? 'text-green-500' : aiFeedback.score > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                             {aiFeedback.score}%
                           </div>
                           <span className="text-sm text-gray-400 font-medium uppercase">Accuracy</span>
                         </div>
                         <div className="flex items-start gap-3 bg-white p-4 rounded-lg text-left shadow-sm">
                            <div className="mt-1 min-w-[24px]">
                                <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 text-sm mb-1">Gemini Teacher:</p>
                                <p className="text-gray-600 italic">"{aiFeedback.feedback}"</p>
                            </div>
                         </div>
                       </div>
                     ) : (
                       <p className="text-gray-400 text-sm">Hold the mic button and read the word aloud. AI will check your pronunciation.</p>
                     )}
                   </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 p-8">
                  <BookIcon />
                  <p className="mt-2">Select a word from the list to start practicing</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-gray-800 hidden md:flex">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white">T</div>
          <h1 className="font-bold text-lg tracking-tight">TAEC Tutor</h1>
        </div>

        <div className="p-4">
            <button 
                onClick={() => setActiveMode(AppMode.DASHBOARD)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-4
                  ${activeMode === AppMode.DASHBOARD ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
                <HomeIcon /> Dashboard
            </button>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Topics</p>
            <nav className="space-y-1 h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
            {VOCABULARY_DATA.map(topic => (
                <button
                key={topic.id}
                onClick={() => { setActiveTopic(topic); setActiveMode(AppMode.LEARN); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${activeTopic.id === topic.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  <span className="truncate">{topic.name}</span>
                  {progress.quizScores[topic.id] !== undefined && (
                      <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded">{progress.quizScores[topic.id]}pts</span>
                  )}
                </button>
            ))}
            </nav>
        </div>

        <div className="mt-auto p-4 bg-gray-900 border-t border-gray-800">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary to-orange-400 flex items-center justify-center text-xs font-bold text-white">
                {progress.learnedWords.length}
             </div>
             <div>
               <p className="text-xs font-bold text-white">My Progress</p>
               <p className="text-[10px] text-gray-400">Streak: {progress.streak} days</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Mobile Header (Topics) */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex overflow-x-auto gap-2">
            <button onClick={() => setActiveMode(AppMode.DASHBOARD)} className="whitespace-nowrap px-3 py-1 rounded-full text-xs bg-gray-700">Dashboard</button>
            {VOCABULARY_DATA.map(topic => (
                 <button 
                 key={topic.id}
                 onClick={() => { setActiveTopic(topic); setActiveMode(AppMode.LEARN); }}
                 className={`whitespace-nowrap px-3 py-1 rounded-full text-xs ${activeTopic.id === topic.id ? 'bg-primary' : 'bg-gray-800'}`}
                 >
                    {topic.name}
                 </button>
            ))}
        </div>

        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
                {activeMode === AppMode.DASHBOARD ? 'Dashboard' : activeTopic.name}
            </h2>
            <p className="text-sm text-gray-500">
                {activeMode === AppMode.DASHBOARD ? 'Overview of your learning journey' : 'Daily Goal: 10 Words'}
            </p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveMode(AppMode.LEARN)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeMode === AppMode.LEARN ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BookIcon /> Learn
            </button>
            <button 
              onClick={() => { setActiveMode(AppMode.FLASHCARD); setCurrentCardIndex(0); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeMode === AppMode.FLASHCARD ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CardIcon /> Flashcards
            </button>
            <button 
              onClick={() => setActiveMode(AppMode.QUIZ)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeMode === AppMode.QUIZ ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <QuizIcon /> Quiz
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;