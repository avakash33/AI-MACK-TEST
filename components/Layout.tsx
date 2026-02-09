
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onHome: () => void;
  onAbout: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  currentState: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onHome, 
  onAbout, 
  onSignIn, 
  onSignUp,
  currentState 
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onHome}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-transform group-hover:scale-110">
              E
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              ExamAI
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={onHome}
              className={`font-medium transition-colors ${currentState === 'IDLE' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              Home
            </button>
            <button 
              onClick={onAbout}
              className={`font-medium transition-colors ${currentState === 'ABOUT' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              About
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onSignIn}
            className="hidden sm:block text-slate-600 hover:text-indigo-600 font-semibold px-4 py-2 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={onSignUp}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-sm"
          >
            Sign Up
          </button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
              <span className="font-bold text-slate-800">ExamAI</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs">
              The world's most advanced AI-powered mock test platform for students and professionals.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><button onClick={onHome} className="hover:text-indigo-600">Home</button></li>
              <li><button onClick={onAbout} className="hover:text-indigo-600">About Us</button></li>
              <li><button className="hover:text-indigo-600">Privacy Policy</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-widest">Account</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><button onClick={onSignIn} className="hover:text-indigo-600">Sign In</button></li>
              <li><button onClick={onSignUp} className="hover:text-indigo-600">Sign Up</button></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 text-center text-slate-400 text-xs">
          © 2025 ExamAI Platform. Powered by Gemini Flash 3.
        </div>
      </footer>
    </div>
  );
};
