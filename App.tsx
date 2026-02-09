
import React, { useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { TestInterface } from './components/TestInterface';
import { ResultAnalytics } from './components/ResultAnalytics';
import { generateMockTestFromContent } from './services/geminiService';
import { AppState, Question, TestResult, TestConfig } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | null>(null);
  const configRef = useRef<HTMLDivElement>(null);
  
  const [config, setConfig] = useState<TestConfig>({
    title: 'Generated Mock Test',
    duration: 15,
    questionCount: 10,
    topics: ''
  });

  const scrollToConfig = () => {
    configRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (base64: string, fileName: string) => {
    setAppState(AppState.GENERATING);
    try {
      const generatedQuestions = await generateMockTestFromContent(base64, config.questionCount, config.topics);
      setQuestions(generatedQuestions);
      setConfig(prev => ({ ...prev, title: fileName.replace('.pdf', '') }));
      setAppState(AppState.TESTING);
    } catch (err) {
      alert("Failed to generate test. Please try another PDF or fewer questions.");
      setAppState(AppState.IDLE);
    }
  };

  const calculateResults = (
    answers: Record<string, number>, 
    timeSpent: number, 
    anomalies: number
  ) => {
    let score = 0;
    const categoryMap: Record<string, { correct: number; total: number }> = {};

    questions.forEach(q => {
      if (!categoryMap[q.category]) {
        categoryMap[q.category] = { correct: 0, total: 0 };
      }
      categoryMap[q.category].total++;

      if (answers[q.id] === q.correctAnswer) {
        score++;
        categoryMap[q.category].correct++;
      }
    });

    const finalResult: TestResult = {
      score,
      totalQuestions: questions.length,
      timeSpent,
      answers,
      timestamp: Date.now(),
      anomalies,
      categoryBreakdown: categoryMap
    };

    setResult(finalResult);
    setAppState(AppState.COMPLETED);
  };

  const restart = () => {
    setAppState(AppState.IDLE);
    setQuestions([]);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateHome = () => {
    setAppState(AppState.IDLE);
    setQuestions([]);
    setResult(null);
  };

  const navigateAbout = () => {
    setAppState(AppState.ABOUT);
  };

  return (
    <Layout 
      onHome={navigateHome} 
      onAbout={navigateAbout}
      onSignIn={() => setShowAuthModal('signin')}
      onSignUp={() => setShowAuthModal('signup')}
      currentState={appState}
    >
      {/* Auth Modal Placeholder */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowAuthModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-8">
               <h3 className="text-3xl font-black text-slate-800 mb-2">
                 {showAuthModal === 'signin' ? 'Welcome Back' : 'Join ExamAI'}
               </h3>
               <p className="text-slate-500 font-medium">Please enter your details to continue.</p>
            </div>
            <div className="space-y-4">
               <input type="email" placeholder="Email Address" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
               <input type="password" placeholder="Password" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
               <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl">
                 {showAuthModal === 'signin' ? 'Sign In' : 'Create Account'}
               </button>
            </div>
          </div>
        </div>
      )}

      {appState === AppState.IDLE && (
        <div className="animate-in fade-in zoom-in duration-500">
          {/* Hero Section */}
          <div className="text-center py-16 md:py-24 max-w-5xl mx-auto">
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100 uppercase tracking-widest">
              Smart Exam Preparation
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-slate-800 mb-10 leading-tight tracking-tight">
              Master Any Subject <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">With AI Mock Tests</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-12">
              The smartest way to prepare. Upload your materials and generate professional-grade exams in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={scrollToConfig}
                className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                Start Quiz Now
              </button>
              <button 
                onClick={navigateAbout}
                className="bg-white text-slate-700 border-2 border-slate-100 px-10 py-5 rounded-[2rem] font-black text-xl hover:bg-slate-50 transition-all"
              >
                How it Works
              </button>
            </div>
          </div>
          
          {/* Main Config Section */}
          <div ref={configRef} className="max-w-4xl mx-auto bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl border border-slate-100 mb-20 scroll-mt-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl">✨</div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800">Exam Configuration</h3>
                    <p className="text-slate-500 font-medium">Tailor the test to your learning goals.</p>
                 </div>
              </div>
              <button onClick={navigateHome} className="text-indigo-600 font-bold hover:underline">Go Home</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Question Volume</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      value={config.questionCount}
                      onChange={(e) => setConfig({...config, questionCount: parseInt(e.target.value)})}
                    >
                      <option value={5}>5 Questions (Rapid)</option>
                      <option value={10}>10 Questions (Standard)</option>
                      <option value={25}>25 Questions (Comprehensive)</option>
                      <option value={50}>50 Questions (Exam Style)</option>
                      <option value={100}>100 Questions (Endurance)</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Time Limit</label>
                  <div className="relative">
                    <select 
                       className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                       value={config.duration}
                       onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                    >
                      <option value={5}>5 Minutes</option>
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={120}>2 Hours</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Topic Focus (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Thermodynamics, Neural Networks, French Revolution..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                    value={config.topics}
                    onChange={(e) => setConfig({...config, topics: e.target.value})}
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-medium">Leave empty for a general test based on the whole PDF.</p>
               </div>
            </div>

            <FileUpload onFileSelect={handleFileUpload} isLoading={false} />
          </div>
        </div>
      )}

      {appState === AppState.ABOUT && (
        <div className="max-w-4xl mx-auto py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h2 className="text-5xl font-black text-slate-800 mb-8">About ExamAI</h2>
           <div className="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-2xl border border-slate-100 space-y-10">
              <section>
                 <h3 className="text-2xl font-bold text-indigo-600 mb-4 tracking-tight">Our Mission</h3>
                 <p className="text-xl text-slate-600 leading-relaxed">
                   ExamAI was built to democratize education by giving every student access to a personal examiner. We use state-of-the-art Generative AI to analyze your learning materials and create custom practice environments that feel like the real thing.
                 </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">Real-time Integrity</h4>
                    <p className="text-slate-500 text-sm">Our "Auto-Detection" system monitors focus during the test, ensuring a distraction-free practice session that mimics actual exam proctoring.</p>
                 </div>
                 <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">Topic Deep Dives</h4>
                    <p className="text-slate-500 text-sm">Don't just get a score. Our radar-chart analytics show you exactly which topics you've mastered and where you need to spend more time.</p>
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                <button 
                  onClick={navigateHome}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                >
                  Back to Home
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-slate-400 font-bold text-sm uppercase">AI Engines Online</span>
                </div>
              </div>
           </div>
        </div>
      )}

      {appState === AppState.GENERATING && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in zoom-in duration-700">
          <div className="relative">
             <div className="w-32 h-32 border-[12px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner"></div>
             <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-indigo-600">AI</div>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-black text-slate-800 mb-4">Generating Your Exam</h2>
            <p className="text-slate-500 font-medium">
               ExamAI is scanning your document, identifying key concepts for {config.topics || 'the content'}, and formulating challenging MCQs...
            </p>
          </div>
          <div className="max-w-sm w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
             <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full w-[60%] animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      )}

      {appState === AppState.TESTING && (
        <TestInterface 
          questions={questions} 
          durationMinutes={config.duration} 
          onComplete={calculateResults}
        />
      )}

      {appState === AppState.COMPLETED && result && (
        <ResultAnalytics 
          result={result} 
          questions={questions} 
          onRestart={restart} 
        />
      )}
    </Layout>
  );
};

export default App;
