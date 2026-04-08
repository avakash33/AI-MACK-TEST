
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { TestInterface } from './components/TestInterface';
import { ResultAnalytics } from './components/ResultAnalytics';
import { generateMockTestFromContent } from './services/geminiService';
import { AppState, Question, TestResult, TestConfig, SavedTest } from './types';
import { translations, Language } from './translations';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  updatePassword,
  signInAnonymously,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc 
} from "firebase/firestore";
import { auth, db } from "./services/firebase";
import { getDocFromServer } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

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
  const [showAuthModal, setShowAuthModal] = useState<'signin' | 'signup' | 'forgot' | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [userTests, setUserTests] = useState<SavedTest[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  
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
  const libraryRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [config, setConfig] = useState<TestConfig>({
    title: 'Generated Mock Test',
    duration: 15,
    questionCount: 10,
    topics: ''
  });

  useEffect(() => {
    async function testConnection() {
      try {
        // Simple test to check if Firestore is reachable and configured correctly
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsLocalMode(false);
        if (user.displayName) {
          const parts = user.displayName.split(' ');
          setProfileName({ first: parts[0] || '', last: parts.slice(1).join(' ') || '' });
        } else if (user.isAnonymous) {
          setProfileName({ first: 'Guest', last: 'User' });
        }
        loadUserTests(user.uid);
      } else {
        // Automatically sign in as guest if no user is present
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
            console.warn("Anonymous Auth disabled or restricted. Falling back to Local Guest Mode.");
            setIsLocalMode(true);
            setProfileName({ first: 'Guest', last: 'User' });
            loadUserTests('');
          } else {
            console.error("Failed to sign in anonymously:", err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserTests = async (uid: string) => {
    if (!uid) {
      setUserTests([]);
      return;
    }

    const localTestsJson = localStorage.getItem('examai_local_tests');
    const localTests: SavedTest[] = localTestsJson ? JSON.parse(localTestsJson) : [];

    const path = `users/${uid}/tests`;
    try {
      const q = query(collection(db, path), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const firestoreTests: SavedTest[] = [];
      querySnapshot.forEach((doc) => {
        firestoreTests.push({ id: doc.id, ...doc.data() } as SavedTest);
      });
      
      // Merge local tests with firestore tests, prioritizing firestore
      const mergedTests = [...firestoreTests];
      localTests.forEach(lt => {
        if (!mergedTests.find(ft => ft.id === lt.id)) {
          mergedTests.push(lt);
        }
      });

      setUserTests(mergedTests.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      // If firestore fails, at least show local tests
      setUserTests(localTests);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!currentUser) return;

    if (testId.startsWith('local_')) {
      const localTests = JSON.parse(localStorage.getItem('examai_local_tests') || '[]');
      const updatedTests = localTests.filter((t: any) => t.id !== testId);
      localStorage.setItem('examai_local_tests', JSON.stringify(updatedTests));
      loadUserTests(currentUser.uid);
      return;
    }

    const path = `users/${currentUser.uid}/tests/${testId}`;
    try {
      await deleteDoc(doc(db, path));
      loadUserTests(currentUser.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const scrollToConfig = () => {
    configRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (base64: string, fileName: string) => {
    setAppState(AppState.GENERATING);
    setGenerationError(null);
    setShowReview(false);
    setGenerationProgress({ current: 0, total: config.questionCount });
    try {
      const generatedQuestions = await generateMockTestFromContent(
        base64, 
        config.questionCount, 
        config.topics,
        (current, total) => setGenerationProgress({ current, total })
      );

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("AI failed to generate any questions. Please try again with a different PDF or topics.");
      }
      
      const testTitle = fileName.replace('.pdf', '');
      const newTestConfig = { ...config, title: testTitle };
      
      const newTestData = {
        title: testTitle,
        questions: generatedQuestions,
        config: newTestConfig,
        createdAt: Date.now()
      };

      if (!currentUser) {
        const localId = `local_${Date.now()}`;
        const localTests = JSON.parse(localStorage.getItem('examai_local_tests') || '[]');
        const newLocalTest = { id: localId, ...newTestData };
        localStorage.setItem('examai_local_tests', JSON.stringify([newLocalTest, ...localTests]));

        setQuestions(generatedQuestions);
        setConfig(newTestConfig);
        setActiveTestId(localId);
        setAppState(AppState.READY);
        return;
      }

      // Save to Firestore
      const path = `users/${currentUser.uid}/tests`;
      try {
        const docRef = await addDoc(collection(db, path), {
          title: testTitle,
          questions: generatedQuestions,
          config: newTestConfig,
          createdAt: Date.now()
        });

        setQuestions(generatedQuestions);
        setConfig(newTestConfig);
        setActiveTestId(docRef.id);
        setAppState(AppState.READY);
        loadUserTests(currentUser.uid); // Refresh history
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      let errorMessage = "Failed to generate test. Please try another PDF or fewer questions.";
      
      if (err.message?.toLowerCase().includes("safety")) {
        errorMessage = "The content of this PDF was flagged by safety filters. Please try another document.";
      } else if (err.message?.includes("quota") || err.message?.includes("429")) {
        errorMessage = "AI service is currently busy. Please wait a moment and try again.";
      } else if (err.message?.toLowerCase().includes("format") || err.message?.toLowerCase().includes("invalid")) {
        errorMessage = "The PDF format seems invalid or unsupported. Please check your file.";
      }
      
      setGenerationError(errorMessage);
    }
  };

  const startSavedTest = (test: SavedTest) => {
    setQuestions(test.questions);
    setConfig(test.config);
    setActiveTestId(test.id);
    setAppState(AppState.TESTING);
  };

  const handleForgotPassword = async () => {
    if (!authData.email) {
      setAuthError("Please enter your email address.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, authData.email);
      setResetSent(true);
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/user-not-found') {
        message = "No account found with this email.";
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
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
      } else if (err.code === 'auth/operation-not-allowed') {
        message = "Authentication method not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable 'Email/Password'.";
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(null);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      let message = err.message;
      if (err.code === 'auth/popup-closed-by-user') {
        message = "Sign-in popup was closed before completion.";
      } else if (err.code === 'auth/operation-not-allowed') {
        message = "Google Sign-In is not enabled. Please enable it in the Firebase Console.";
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

    // Update result in Firestore or Local Storage
    if (activeTestId) {
      if (activeTestId.startsWith('local_') || isLocalMode || !currentUser) {
        const localTests: SavedTest[] = JSON.parse(localStorage.getItem('examai_local_tests') || '[]');
        const updatedTests = localTests.map(t => 
          t.id === activeTestId ? { ...t, lastResult: finalResult } : t
        );
        localStorage.setItem('examai_local_tests', JSON.stringify(updatedTests));
        loadUserTests(currentUser?.uid || '');
      } else if (currentUser) {
        const path = `users/${currentUser.uid}/tests/${activeTestId}`;
        try {
          const testDocRef = doc(db, path);
          await updateDoc(testDocRef, {
            lastResult: finalResult
          });
          loadUserTests(currentUser.uid); // Refresh history list
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      }
    }

    setResult(finalResult);
    setAppState(AppState.COMPLETED);
  };

  const restart = () => {
    setAppState(AppState.IDLE);
    setQuestions([]);
    setResult(null);
    setShowReview(false);
    setActiveTestId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retakeTest = () => {
    setResult(null);
    setShowReview(false);
    setAppState(AppState.TESTING);
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

  const navigateHistory = () => {
    setAppState(AppState.HISTORY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const t = translations[language];

  return (
    <Layout 
      onHome={navigateHome} 
      onAbout={navigateAbout}
      onHistory={navigateHistory}
      onProfile={navigateProfile}
      onSignIn={() => { setAuthError(null); setShowAuthModal('signin'); }}
      onSignUp={() => { setAuthError(null); setShowAuthModal('signup'); }}
      onSignOut={handleSignOut}
      currentState={appState}
      user={currentUser}
      isLocalMode={isLocalMode}
      language={language}
      onLanguageChange={setLanguage}
    >
      {authError && !showAuthModal && (
        <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-lg">⚠️</div>
            <p className="text-sm font-bold text-red-600">{authError}</p>
          </div>
          <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-600 font-bold text-xl px-2">×</button>
        </div>
      )}
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
                 {showAuthModal === 'signin' ? t.nav.signIn : showAuthModal === 'signup' ? t.nav.signUp : 'Reset Password'}
               </h3>
               <p className="text-slate-500 font-medium">
                 {showAuthModal === 'forgot' ? 'Enter your email to receive a reset link.' : 'Please enter your details to continue.'}
               </p>
            </div>
            <div className="space-y-4">
               {authError && (
                 <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100">
                   {authError}
                 </div>
               )}
               {resetSent && (
                 <div className="bg-green-50 text-green-600 text-xs font-bold p-4 rounded-xl border border-green-100">
                   Password reset link sent! Please check your inbox.
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
               {showAuthModal !== 'forgot' && (
                 <input 
                   type="password" 
                   placeholder="Password" 
                   value={authData.password}
                   onChange={(e) => setAuthData({...authData, password: e.target.value})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-base" 
                 />
               )}
               {showAuthModal === 'signin' && (
                 <div className="text-right">
                   <button 
                     onClick={() => {
                       setAuthError(null);
                       setResetSent(false);
                       setShowAuthModal('forgot');
                     }}
                     className="text-indigo-600 text-xs font-bold hover:underline"
                   >
                     Forgot Password?
                   </button>
                 </div>
               )}
               <button 
                 disabled={authLoading || (showAuthModal === 'forgot' && resetSent)}
                 onClick={showAuthModal === 'forgot' ? handleForgotPassword : handleAuthAction}
                 className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
               >
                 {authLoading ? (
                   <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                   showAuthModal === 'signin' ? 'Sign In' : showAuthModal === 'signup' ? 'Create Account' : 'Send Reset Link'
                 )}
               </button>

               {showAuthModal !== 'forgot' && (
                 <>
                   <div className="relative py-4">
                     <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-slate-200"></div>
                     </div>
                     <div className="relative flex justify-center text-xs uppercase">
                       <span className="bg-white px-2 text-slate-400 font-bold">Or continue with</span>
                     </div>
                   </div>

                   <button 
                     type="button"
                     disabled={authLoading}
                     onClick={handleGoogleSignIn}
                     className="w-full bg-white text-slate-700 border-2 border-slate-100 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                   >
                     <svg className="w-6 h-6" viewBox="0 0 24 24">
                       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                     </svg>
                     Google
                   </button>
                 </>
               )}

               <div className="text-center pt-2">
                 <button 
                   onClick={() => {
                     setAuthError(null);
                     setResetSent(false);
                     if (showAuthModal === 'forgot') {
                       setShowAuthModal('signin');
                     } else {
                       setShowAuthModal(showAuthModal === 'signin' ? 'signup' : 'signin');
                     }
                   }}
                   className="text-indigo-600 text-sm font-bold hover:underline py-2"
                 >
                   {showAuthModal === 'signin' ? "Don't have an account? Sign Up" : 
                    showAuthModal === 'signup' ? "Already have an account? Sign In" : 
                    "Back to Sign In"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {(appState === AppState.IDLE || appState === AppState.GENERATING) && (
        <div className="animate-in fade-in zoom-in duration-500">
          {appState === AppState.IDLE && (
            <div className="text-center py-12 md:py-20 max-w-4xl mx-auto px-4">
              <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-50 text-indigo-600 text-xs md:sm font-bold border border-indigo-100 uppercase tracking-widest">
                {t.hero.badge}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-800 mb-6 md:mb-10 leading-tight tracking-tight">
                {t.hero.title1} <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">{t.hero.title2}</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10 md:mb-12">
                {t.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={scrollToConfig}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg md:text-xl hover:bg-indigo-700 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-95"
                >
                  {t.hero.ctaPrimary}
                </button>
                <button 
                  onClick={navigateAbout}
                  className="w-full sm:w-auto bg-white text-slate-700 border-2 border-slate-100 px-10 py-5 rounded-[2rem] font-black text-lg md:text-xl hover:bg-slate-50 transition-all active:scale-95"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
            </div>
          )}

          <div ref={configRef} className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 mb-20 scroll-mt-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-12 gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl">✨</div>
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800">{t.config.title}</h3>
                    <p className="text-sm md:text-base text-slate-500 font-medium">{t.config.subtitle}</p>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10">
               <div>
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.config.volume}</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-base disabled:opacity-50"
                      value={config.questionCount}
                      onChange={(e) => setConfig({...config, questionCount: parseInt(e.target.value)})}
                      disabled={appState === AppState.GENERATING}
                    >
                      <option value={10}>10 Questions</option>
                      <option value={25}>25 Questions</option>
                      <option value={50}>50 Questions</option>
                      <option value={100}>100 Questions</option>
                      <option value={500}>500 Questions</option>
                      <option value={1000}>1000 Questions</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.config.time}</label>
                  <div className="relative">
                    <select 
                       className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-base disabled:opacity-50"
                       value={config.duration}
                       onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                       disabled={appState === AppState.GENERATING}
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={120}>2 Hours</option>
                      <option value={180}>3 Hours</option>
                      <option value={300}>5 Hours</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.config.topics}</label>
                  <input 
                    type="text"
                    placeholder={t.config.topicsPlaceholder}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 text-base disabled:opacity-50"
                    value={config.topics}
                    onChange={(e) => setConfig({...config, topics: e.target.value})}
                    disabled={appState === AppState.GENERATING}
                  />
               </div>
            </div>

            <FileUpload 
              onFileSelect={handleFileUpload} 
              isLoading={appState === AppState.GENERATING} 
              language={language} 
              progress={generationProgress}
            />

            {generationError && (
              <div className="mt-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4 text-red-600 mb-2">
                  <span className="text-xl">⚠️</span>
                  <h4 className="font-black uppercase tracking-widest text-xs">{t.generating.failed}</h4>
                </div>
                <p className="text-red-500 font-bold text-sm">{generationError}</p>
                <button 
                  onClick={() => setGenerationError(null)}
                  className="mt-4 text-red-600 font-black text-xs uppercase tracking-widest hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {appState === AppState.HISTORY && currentUser && !currentUser.isAnonymous && (
        <div className="max-w-5xl mx-auto py-8 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl md:text-4xl font-black text-slate-800">
                {t.library.myLibrary}
              </h3>
              <p className="text-slate-400 font-bold text-sm uppercase">{userTests.length} {t.library.testsSaved}</p>
           </div>
           {userTests.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTests.map(test => (
                  <div key={test.id} className="group bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 hover:border-indigo-200 transition-all hover:-translate-y-1 flex flex-col justify-between relative">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         deleteTest(test.id);
                       }}
                       className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
                       title="Delete Test"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                       </svg>
                     </button>
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">📄</div>
                           <span className="text-[10px] font-black text-slate-300 uppercase bg-slate-50 px-2 py-1 rounded">
                              {new Date(test.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{test.title}</h4>
                        <div className="flex gap-2 mb-4">
                           <span className="text-xs font-bold text-slate-400">{test.questions.length} {t.ready.questions}</span>
                           <span className="text-xs font-bold text-slate-400">•</span>
                           <span className="text-xs font-bold text-slate-400">{test.config.duration} Mins</span>
                        </div>
                        {test.lastResult && (
                          <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                             <span className="text-[10px] font-bold text-green-600 uppercase">{t.results.accuracy}</span>
                             <span className="text-lg font-black text-green-600">{Math.round((test.lastResult.score / test.lastResult.totalQuestions) * 100)}%</span>
                          </div>
                        )}
                     </div>
                     <button 
                      onClick={() => startSavedTest(test)}
                      className="w-full bg-slate-50 text-slate-700 py-3 rounded-2xl font-bold hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                     >
                       {t.library.startNow}
                     </button>
                  </div>
                ))}
             </div>
           ) : (
             <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">📚</div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">{t.library.emptyTitle}</h4>
                <p className="text-slate-500 mb-6">{t.library.emptySub}</p>
                <button 
                  onClick={navigateHome}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  {t.library.emptyCta}
                </button>
             </div>
           )}
        </div>
      )}

      {appState === AppState.ABOUT && (
        <div className="max-w-4xl mx-auto py-8 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
           <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8">{t.about.title}</h2>
           <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 space-y-10">
              <section>
                 <h3 className="text-xl md:text-2xl font-bold text-indigo-600 mb-4 tracking-tight">{t.about.missionTitle}</h3>
                 <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                   {t.about.missionText}
                 </p>
              </section>

              <section className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100">
                 <h3 className="text-xl font-bold text-indigo-700 mb-4">{t.about.langRulesTitle}</h3>
                 <p className="text-slate-600 mb-4 font-medium">{t.about.langRulesText}</p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                       <p className="text-sm font-bold text-slate-700">{t.about.langRule1}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                       <p className="text-sm font-bold text-slate-700">{t.about.langRule2}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                       <p className="text-sm font-bold text-slate-700">{t.about.langRule3}</p>
                    </div>
                 </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                 <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">{t.about.feat1Title}</h4>
                    <p className="text-slate-500 text-sm">{t.about.feat1Text}</p>
                 </div>
                 <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-3">{t.about.feat2Title}</h4>
                    <p className="text-slate-500 text-sm">{t.about.feat2Text}</p>
                 </div>
              </div>

              <div className="text-center pt-4 border-t border-slate-50">
                <p className="text-slate-400 font-bold text-sm">
                  {t.about.poweredBy} <span className="text-indigo-600">AKASH VISHWAKARMA</span> | Supported mail ID: <a href="mailto:akashvishwakarma.in@gmail.com" className="text-indigo-600 hover:underline">akashvishwakarma.in@gmail.com</a>
                </p>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <button 
                  onClick={navigateHome}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                  {t.about.backHome}
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
              <h2 className="text-3xl md:text-4xl font-black text-slate-800">{t.profile.title}</h2>
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
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">{currentUser.displayName || (currentUser.isAnonymous ? t.nav.guest : "User")}</h3>
                    <p className="text-slate-500 font-medium text-sm mb-6">{currentUser.email || t.nav.guestAccount}</p>
                    {currentUser.isAnonymous && (
                      <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-600 leading-relaxed">
                          {t.profile.guestWarning}
                        </p>
                      </div>
                    )}
                    <div className="pt-6 border-t border-slate-100">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t.profile.quickIcons}</p>
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
                       {t.profile.settings}
                    </h4>
                    {profileMessage.text && (
                       <div className={`mb-8 p-4 rounded-xl border text-sm font-bold ${profileMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                          {profileMessage.text}
                       </div>
                    )}
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.profile.firstName}</label>
                             <input type="text" value={profileName.first} onChange={(e) => setProfileName({...profileName, first: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
                          </div>
                          <div>
                             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.profile.lastName}</label>
                             <input type="text" value={profileName.last} onChange={(e) => setProfileName({...profileName, last: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.profile.password}</label>
                          <input 
                            type="password" 
                            placeholder={currentUser.isAnonymous ? t.profile.passwordGuest : t.profile.passwordPlaceholder} 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            disabled={currentUser.isAnonymous}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all disabled:opacity-50" 
                          />
                       </div>
                       <div className="pt-4">
                          <button onClick={updateProfileInfo} disabled={profileUpdateLoading} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center disabled:opacity-50">
                             {profileUpdateLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : t.profile.save}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {appState === AppState.GENERATING && generationError && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in zoom-in duration-700 px-4">
          <div className="max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-red-100 animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
              ⚠️
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">{t.generating.failed}</h2>
            <p className="text-slate-500 font-medium mb-8">
              {generationError}
            </p>
            <button 
              onClick={() => {
                setAppState(AppState.IDLE);
                setGenerationError(null);
              }}
              className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg"
            >
              {t.generating.back}
            </button>
          </div>
        </div>
      )}

      {appState === AppState.READY && (
        <div className="max-w-2xl mx-auto py-8 md:py-12 animate-in fade-in slide-in-from-bottom-8 duration-700 px-4">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600"></div>
            
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
              ✅
            </div>
            
            <h2 className="text-xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight">
              {t.ready.title}
            </h2>
            <p className="text-sm md:text-base text-slate-500 font-medium mb-8 max-w-sm mx-auto">
              {t.ready.subtitle.replace('{title}', config.title)}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.ready.questions}</p>
                <p className="text-xl font-black text-indigo-600">{questions.length}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.ready.duration}</p>
                <p className="text-xl font-black text-indigo-600">{config.duration}m</p>
              </div>
            </div>

            <div className="mb-8 text-left">
              <button 
                onClick={() => setShowReview(!showReview)}
                className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:underline mb-3"
              >
                {showReview ? 'Hide Question Preview' : 'Preview Questions'}
                <span className="text-xs">{showReview ? '↑' : '↓'}</span>
              </button>
              
              {showReview && (
                <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-slate-100 space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="pb-3 border-b border-slate-200 last:border-0">
                      <p className="text-xs font-bold text-slate-700 mb-1">Q{idx + 1}: {language === 'hi' && q.hindiQuestion ? q.hindiQuestion : q.question}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{q.category} • {q.difficulty}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setAppState(AppState.TESTING)}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg md:text-xl hover:bg-indigo-700 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
              >
                {t.ready.start}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button 
                onClick={navigateHome}
                className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors py-1"
              >
                {t.ready.back}
              </button>
            </div>
          </div>
        </div>
      )}

      {appState === AppState.TESTING && (
        <TestInterface 
          questions={questions} 
          durationMinutes={config.duration} 
          onComplete={calculateResults}
          language={language}
        />
      )}

      {appState === AppState.COMPLETED && result && (
        <ResultAnalytics 
          result={result} 
          questions={questions} 
          onHome={restart}
          onRetake={retakeTest}
        />
      )}
    </Layout>
  );
};

export default App;
