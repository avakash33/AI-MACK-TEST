
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { TestInterface } from './components/TestInterface';
import { ResultAnalytics } from './components/ResultAnalytics';
import { generateMockTestFromContent } from './services/geminiService';
import { AppState, Question, TestResult, TestConfig, SavedTest } from './types';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  updatePassword,
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { auth, db } from "./services/firebase";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Anya",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe"
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userTests, setUserTests] = useState<SavedTest[]>([]);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  
  // Profile Update State
  const [profileName, setProfileName] = useState({ first: '', last: '' });
  const [newPassword, setNewPassword] = useState('');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: 'success' });
  
  const [authData, setAuthData] = useState({ 
    email: '', 
    password: '',
    firstName: '',
    lastName: ''
  });
  const configRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [config, setConfig] = useState<TestConfig>({
    title: 'Generated Mock Test',
    duration: 15,
    questionCount: 10,
    topics: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.displayName) {
          const parts = user.displayName.split(' ');
          setProfileName({ first: parts[0] || '', last: parts.slice(1).join(' ') || '' });
        }
        fetchUserTests(user.uid);
      } else {
        setUserTests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserTests = async (uid: string) => {
    try {
      const q = query(collection(db, "users", uid, "tests"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const tests: SavedTest[] = [];
      querySnapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() } as SavedTest);
      });
      setUserTests(tests);
    } catch (err) {
      console.error("Error fetching tests:", err);
    }
  };

  const scrollToConfig = () => {
    if (!currentUser) {
      setShowAuthModal('signin');
      return;
    }
    configRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (base64: string, fileName: string) => {
    if (!currentUser) {
      setShowAuthModal('signin');
      return;
    }
    setAppState(AppState.GENERATING);
    try {
      const generatedQuestions = await generateMockTestFromContent(base64, config.questionCount, config.topics);
      
      const testTitle = fileName.replace('.pdf', '');
      const newTestConfig = { ...config, title: testTitle };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, "users", currentUser.uid, "tests"), {
        title: testTitle,
        questions: generatedQuestions,
        config: newTestConfig,
        createdAt: Date.now()
      });

      setQuestions(generatedQuestions);
      setConfig(newTestConfig);
      setActiveTestId(docRef.id);
      setAppState(AppState.TESTING);
      fetchUserTests(currentUser.uid); // Refresh history
    } catch (err) {
      alert("Failed to generate test. Please try another PDF or fewer questions.");
      setAppState(AppState.IDLE);
    }
  };

  const startSavedTest = (test: SavedTest) => {
    setQuestions(test.questions);
    setConfig(test.config);
    setActiveTestId(test.id);
    setAppState(AppState.TESTING);
  };

  const handleAuthAction = async () => {
    if (!authData.email || !authData.password) {
      setAuthError("Please fill in all fields.");
      return;
    }

    if (showAuthModal === 'signup' && (!authData.firstName || !authData.lastName)) {
      setAuthError("Please enter your first and last name.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      if (showAuthModal === 'signin') {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(userCredential.user, {
          displayName: `${authData.firstName} ${authData.lastName}`
        });
        setCurrentUser(auth.currentUser);
      }
      setShowAuthModal(null);
      setAuthData({ email: '', password: '', firstName: '', lastName: '' });
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = "Invalid email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        message = "Email is already registered.";
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateProfileInfo = async () => {
    if (!currentUser) return;
    setProfileUpdateLoading(true);
    setProfileMessage({ text: '', type: 'success' });
    
    try {
      await updateProfile(currentUser, {
        displayName: `${profileName.first} ${profileName.last}`
      });

      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
      }

      setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
      setCurrentUser({...auth.currentUser} as User);
    } catch (err: any) {
      setProfileMessage({ 
        text: err.message || "Failed to update profile. You might need to re-login to change sensitive data.", 
        type: 'error' 
      });
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const updateAvatar = async (url: string) => {
    if (!currentUser) return;
    try {
      await updateProfile(currentUser, { photoURL: url });
      setCurrentUser({...auth.currentUser} as User);
      setProfileMessage({ text: 'Profile icon updated!', type: 'success' });
    } catch (err) {
      setProfileMessage({ text: 'Failed to update icon.', type: 'error' });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAppState(AppState.IDLE);
  };

  const calculateResults = async (
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

    // Update result in Firestore if test was saved
    if (currentUser && activeTestId) {
      try {
        const testDocRef = doc(db, "users", currentUser.uid, "tests", activeTestId);
        await updateDoc(testDocRef, {
          lastResult: finalResult
        });
        fetchUserTests(currentUser.uid); // Refresh history list
      } catch (err) {
        console.error("Error saving result:", err);
      }
    }

    setResult(finalResult);
    setAppState(AppState.COMPLETED);
  };

  const restart = () => {
    setAppState(AppState.IDLE);
    setQuestions([]);
    setResult(null);
    setActiveTestId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateHome = () => {
    setAppState(AppState.IDLE);
    setQuestions([]);
    setResult(null);
    setActiveTestId(null);
  };

  const navigateAbout = () => {
    setAppState(AppState.ABOUT);
  };

  const navigateProfile = () => {
    setAppState(AppState.PROFILE);
  };

  return (
    <Layout 
      onHome={navigateHome} 
      onAbout={navigateAbout}
      onProfile={navigateProfile}
      onSignIn={() => { setAuthError(null); setShowAuthModal('signin'); }}
      onSignUp={() => { setAuthError(null); setShowAuthModal('signup'); }}
      onSignOut={handleSignOut}
      currentState={appState}
      user={currentUser}
    >
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAuthModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-8">
               <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">
                 {showAuthModal === 'signin' ? 'Welcome Back' : 'Join ExamAI'}
               </h3>
               <p className="text-slate-500 font-medium">Please enter your details to continue.</p>
            </div>
            <div className="space-y-4">
               {authError && (
                 <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100">
                   {authError}
                 </div>
               )}
               {showAuthModal === 'signup' && (
                 <div className="grid grid-cols-2 gap-4">
                   <input 
                     type="text" 
                     placeholder="First Name" 
                     value={authData.firstName}
                     onChange={(e) => setAuthData({...authData, firstName: e.target.value})}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-base" 
                   />
                   <input 
                     type="text" 
                     placeholder="Last Name" 
                     value={authData.lastName}
                     onChange={(e) => setAuthData({...authData, lastName: e.target.value})}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-base" 
                   />
                 </div>
               )}
               <input 
                 type="email" 
                 placeholder="Email Address" 
                 value={authData.email}
                 onChange={(e) => setAuthData({...authData, email: e.target.value})}
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-base" 
               />
               <input 
                 type="password" 
                 placeholder="Password" 
                 value={authData.password}
                 onChange={(e) => setAuthData({...authData, password: e.target.value})}
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-base" 
               />
               <button 
                 disabled={authLoading}
                 onClick={handleAuthAction}
                 className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
               >
                 {authLoading ? (
                   <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                   showAuthModal === 'signin' ? 'Sign In' : 'Create Account'
                 )}
               </button>
               <div className="text-center pt-2">
                 <button 
                   onClick={() => {
                     setAuthError(null);
                     setShowAuthModal(showAuthModal === 'signin' ? 'signup' : 'signin');
                   }}
                   className="text-indigo-600 text-sm font-bold hover:underline py-2"
                 >
                   {showAuthModal === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {appState === AppState.IDLE && (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="text-center py-12 md:py-24 max-w-5xl mx-auto px-4">
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-50 text-indigo-600 text-xs md:sm font-bold border border-indigo-100 uppercase tracking-widest">
              Smart Exam Preparation
            </div>
            <h1 className="text-4xl md:text-8xl font-black text-slate-800 mb-6 md:mb-10 leading-tight tracking-tight">
              Master Any Subject <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">With AI Mock Tests</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10 md:mb-12">
              The smartest way to prepare. Upload your materials and generate professional-grade exams in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={scrollToConfig}
                className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg md:text-xl hover:bg-indigo-700 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-95"
              >
                Create New Test
              </button>
              <button 
                onClick={navigateAbout}
                className="w-full sm:w-auto bg-white text-slate-700 border-2 border-slate-100 px-10 py-5 rounded-[2rem] font-black text-lg md:text-xl hover:bg-slate-50 transition-all active:scale-95"
              >
                Learn More
              </button>
            </div>
          </div>

          {currentUser && userTests.length > 0 && (
            <div className="max-w-6xl mx-auto mb-20 px-4">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-black text-slate-800">My Library</h3>
                  <p className="text-slate-400 font-bold text-sm uppercase">{userTests.length} tests saved</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userTests.map(test => (
                    <div key={test.id} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all group flex flex-col justify-between">
                       <div>
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">📄</div>
                             <span className="text-[10px] font-black text-slate-300 uppercase bg-slate-50 px-2 py-1 rounded">
                                {new Date(test.createdAt).toLocaleDateString()}
                             </span>
                          </div>
                          <h4 className="text-xl font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{test.title}</h4>
                          <div className="flex gap-2 mb-4">
                             <span className="text-xs font-bold text-slate-400">{test.questions.length} Questions</span>
                             <span className="text-xs font-bold text-slate-400">•</span>
                             <span className="text-xs font-bold text-slate-400">{test.config.duration} Mins</span>
                          </div>
                          {test.lastResult && (
                            <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                               <span className="text-[10px] font-bold text-green-600 uppercase">Last Score</span>
                               <span className="text-lg font-black text-green-600">{Math.round((test.lastResult.score / test.lastResult.totalQuestions) * 100)}%</span>
                            </div>
                          )}
                       </div>
                       <button 
                        onClick={() => startSavedTest(test)}
                        className="w-full bg-slate-50 text-slate-700 py-3 rounded-2xl font-bold hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                       >
                         Start Test Now
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
          
          <div ref={configRef} className="max-w-4xl mx-auto bg-white p-6 md:p-14 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 mb-20 scroll-mt-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-12 gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl">✨</div>
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800">New Custom Test</h3>
                    <p className="text-sm md:text-base text-slate-500 font-medium">Upload a document to generate a new persistent mock test.</p>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10">
               <div>
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Question Volume</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-base"
                      value={config.questionCount}
                      onChange={(e) => setConfig({...config, questionCount: parseInt(e.target.value)})}
                    >
                      <option value={10}>10 Questions (Short)</option>
                      <option value={25}>25 Questions (Standard)</option>
                      <option value={50}>50 Questions (Long)</option>
                      <option value={100}>100 Questions (Endurance)</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Time Limit</label>
                  <div className="relative">
                    <select 
                       className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-base"
                       value={config.duration}
                       onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={120}>2 Hours</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Topic Focus (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Focus AI on specific chapters or concepts..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 text-base"
                    value={config.topics}
                    onChange={(e) => setConfig({...config, topics: e.target.value})}
                  />
               </div>
            </div>

            <FileUpload onFileSelect={handleFileUpload} isLoading={false} />
          </div>
        </div>
      )}

      {appState === AppState.ABOUT && (
        <div className="max-w-4xl mx-auto py-8 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
           <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-8">About ExamAI</h2>
           <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-14 shadow-2xl border border-slate-100 space-y-10">
              <section>
                 <h3 className="text-xl md:text-2xl font-bold text-indigo-600 mb-4 tracking-tight">Our Mission</h3>
                 <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                   ExamAI was built to democratize education by giving every student access to a personal examiner. We use state-of-the-art Generative AI to analyze your learning materials and create custom practice environments that feel like the real thing.
                 </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                 <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">Real-time Integrity</h4>
                    <p className="text-slate-500 text-sm">Our "Auto-Detection" system monitors focus during the test, ensuring a distraction-free practice session that mimics actual exam proctoring.</p>
                 </div>
                 <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">Topic Deep Dives</h4>
                    <p className="text-slate-500 text-sm">Don't just get a score. Our radar-chart analytics show you exactly which topics you've mastered and where you need to spend more time.</p>
                 </div>
              </div>

              <div className="text-center pt-4 border-t border-slate-50">
                <p className="text-slate-400 font-bold text-sm">
                  Powered by <span className="text-indigo-600">AKASH VISHWAKARMA</span> | Supported mail ID: <a href="mailto:akashvishwakarma.in@gmail.com" className="text-indigo-600 hover:underline">akashvishwakarma.in@gmail.com</a>
                </p>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <button 
                  onClick={navigateHome}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                  Back to Home
                </button>
              </div>
           </div>
        </div>
      )}

      {appState === AppState.PROFILE && currentUser && (
        <div className="max-w-4xl mx-auto py-8 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={navigateHome} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 className="text-4xl md:text-5xl font-black text-slate-800">My Profile</h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                 <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-50 flex items-center justify-center group">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-indigo-600 font-black text-4xl">
                            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                          </span>
                        )}
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">{currentUser.displayName || "User"}</h3>
                    <p className="text-slate-500 font-medium text-sm mb-6">{currentUser.email}</p>
                    <div className="pt-6 border-t border-slate-100">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Icons</p>
                       <div className="flex justify-center gap-3">
                          {PRESET_AVATARS.map((url, i) => (
                             <button key={i} onClick={() => updateAvatar(url)} className="w-10 h-10 rounded-full border-2 border-slate-100 hover:border-indigo-400 transition-all overflow-hidden">
                                <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100">
                    <h4 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                       <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-base">👤</span>
                       Profile Settings
                    </h4>
                    {profileMessage.text && (
                       <div className={`mb-8 p-4 rounded-xl border text-sm font-bold ${profileMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                          {profileMessage.text}
                       </div>
                    )}
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">First Name</label>
                             <input type="text" value={profileName.first} onChange={(e) => setProfileName({...profileName, first: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
                          </div>
                          <div>
                             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Last Name</label>
                             <input type="text" value={profileName.last} onChange={(e) => setProfileName({...profileName, last: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Update Password</label>
                          <input type="password" placeholder="Enter new password (optional)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
                       </div>
                       <div className="pt-4">
                          <button onClick={updateProfileInfo} disabled={profileUpdateLoading} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center disabled:opacity-50">
                             {profileUpdateLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : "Save Changes"}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {appState === AppState.GENERATING && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in zoom-in duration-700 px-4">
          <div className="relative">
             <div className="w-24 h-24 md:w-32 md:h-32 border-[8px] md:border-[12px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner"></div>
             <div className="absolute inset-0 flex items-center justify-center font-black text-xl md:text-2xl text-indigo-600">AI</div>
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4">Generating Your Permanent Exam</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium">
               ExamAI is analyzing your material and creating a high-quality test that will be saved to your dashboard for life.
            </p>
          </div>
          <div className="max-w-xs md:max-w-sm w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
             <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full w-[60%] animate-pulse"></div>
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
