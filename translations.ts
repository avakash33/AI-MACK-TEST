
export type Language = 'en' | 'hi';

export const translations = {
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      history: 'History',
      profile: 'Profile',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      guest: 'Guest User',
      localMode: 'Local Mode',
      guestAccount: 'Guest Account'
    },
    hero: {
      badge: 'Smart Exam Preparation',
      title1: 'Master Any Subject',
      title2: 'With AI Mock Tests',
      subtitle: 'The smartest way to prepare. Upload your materials and generate professional-grade exams in seconds.',
      ctaPrimary: 'Create New Test',
      ctaSecondary: 'Learn More'
    },
    library: {
      myLibrary: 'My Library',
      testsSaved: 'tests saved',
      startNow: 'Start Test Now',
      emptyTitle: 'Your library is empty',
      emptySub: 'Generate your first test to see it here.',
      emptyCta: 'Create a test now →'
    },
    config: {
      title: 'New Custom Test',
      subtitle: 'Upload a document to generate a new persistent mock test.',
      volume: 'Question Volume',
      time: 'Time Limit',
      topics: 'Topic Focus (Optional)',
      topicsPlaceholder: 'Focus AI on specific chapters or concepts...',
      uploadTitle: 'Upload Syllabus or Study Material',
      uploadSub: 'PDF files supported. AI will generate questions automatically.',
      uploadBtn: 'Select PDF File',
      uploadLimit: 'Maximum file size: 10MB'
    },
    about: {
      title: 'About ExamAI',
      missionTitle: 'Our Mission',
      missionText: 'ExamAI was built to democratize education by giving every student access to a personal examiner. We use state-of-the-art Generative AI to analyze your learning materials and create custom practice environments that feel like the real thing.',
      feat1Title: 'Real-time Integrity',
      feat1Text: 'Our "Auto-Detection" system monitors focus during the test, ensuring a distraction-free practice session that mimics actual exam proctoring.',
      feat2Title: 'Topic Deep Dives',
      feat2Text: "Don't just get a score. Our radar-chart analytics show you exactly which topics you've mastered and where you need to spend more time.",
      langRulesTitle: 'Language Intelligence',
      langRulesText: 'Our AI automatically adapts to your material:',
      langRule1: '• Hindi PDF → Hindi Mock Test',
      langRule2: '• English PDF → English Mock Test',
      langRule3: '• Bilingual PDF → Test in Both Languages',
      poweredBy: 'Powered by',
      backHome: 'Back to Home'
    },
    profile: {
      title: 'My Profile',
      settings: 'Profile Settings',
      firstName: 'First Name',
      lastName: 'Last Name',
      password: 'Update Password',
      passwordPlaceholder: 'Enter new password (optional)',
      passwordGuest: 'Not available for Guest accounts',
      save: 'Save Changes',
      guestWarning: 'You are using a Guest Account. Sign up to sync your history across devices!',
      quickIcons: 'Quick Icons'
    },
    generating: {
      title: 'Generating Your Permanent Exam',
      subtitle: 'ExamAI is analyzing your material and creating a high-quality test that will be saved to your dashboard for life.',
      progress: 'Generated {current} of {total} questions...',
      failed: 'Generation Failed',
      back: 'Back to Dashboard'
    },
    ready: {
      title: 'Exam Ready!',
      subtitle: 'Your custom exam "{title}" has been successfully generated and saved to your library.',
      questions: 'Questions',
      duration: 'Duration',
      start: 'Start Exam Now',
      back: 'Back to Dashboard'
    },
    test: {
      timer: '⏱️ {time}',
      questionOf: 'Question {current} of {total}',
      warning: '⚠️ Warning: Focus lost!',
      submit: 'Submit Final Exam',
      hint: '💡 Get a Hint',
      hideHint: '💡 Hide Hint',
      hintLabel: 'Hint:',
      prev: '← Previous',
      next: 'Next Question →',
      end: 'End of Test',
      navigator: 'Question Navigator'
    },
    results: {
      performance: 'Performance',
      accuracy: 'Accuracy',
      correct: 'Correct',
      incorrect: 'Incorrect',
      completed: 'Test Completed',
      effort: 'Great Effort!',
      proficiency: 'Topical Proficiency',
      stats: 'Execution Stats',
      timeTaken: 'Time Taken',
      anomalies: 'Anomalies',
      pace: 'Pace',
      retake: 'Retake Exam',
      review: 'Detailed Review',
      solution: 'Solution & Explanation'
    }
  },
  hi: {
    nav: {
      home: 'होम',
      about: 'हमारे बारे में',
      history: 'इतिहास',
      profile: 'प्रोफ़ाइल',
      signIn: 'साइन इन',
      signUp: 'साइन अप',
      signOut: 'साइन आउट',
      guest: 'अतिथि उपयोगकर्ता',
      localMode: 'लोकल मोड',
      guestAccount: 'अतिथि खाता'
    },
    hero: {
      badge: 'स्मार्ट परीक्षा तैयारी',
      title1: 'किसी भी विषय में महारत हासिल करें',
      title2: 'AI मॉक टेस्ट के साथ',
      subtitle: 'तैयारी करने का सबसे स्मार्ट तरीका। अपनी सामग्री अपलोड करें और सेकंडों में पेशेवर-ग्रेड परीक्षाएँ उत्पन्न करें।',
      ctaPrimary: 'नया टेस्ट बनाएं',
      ctaSecondary: 'अधिक जानें'
    },
    library: {
      myLibrary: 'मेरी लाइब्रेरी',
      testsSaved: 'टेस्ट सहेजे गए',
      startNow: 'अभी टेस्ट शुरू करें',
      emptyTitle: 'आपकी लाइब्रेरी खाली है',
      emptySub: 'इसे यहाँ देखने के लिए अपना पहला टेस्ट उत्पन्न करें।',
      emptyCta: 'अभी एक टेस्ट बनाएं →'
    },
    config: {
      title: 'नया कस्टम टेस्ट',
      subtitle: 'एक नया स्थायी मॉक टेस्ट उत्पन्न करने के लिए दस्तावेज़ अपलोड करें।',
      volume: 'प्रश्नों की संख्या',
      time: 'समय सीमा',
      topics: 'विषय फोकस (वैकल्पिक)',
      topicsPlaceholder: 'विशिष्ट अध्यायों या अवधारणाओं पर AI को केंद्रित करें...',
      uploadTitle: 'पाठ्यक्रम या अध्ययन सामग्री अपलोड करें',
      uploadSub: 'PDF फाइलें समर्थित हैं। AI स्वचालित रूप से प्रश्न उत्पन्न करेगा।',
      uploadBtn: 'PDF फाइल चुनें',
      uploadLimit: 'अधिकतम फ़ाइल आकार: 10MB'
    },
    about: {
      title: 'ExamAI के बारे में',
      missionTitle: 'हमारा मिशन',
      missionText: 'ExamAI को हर छात्र को एक व्यक्तिगत परीक्षक तक पहुंच प्रदान करके शिक्षा का लोकतंत्रीकरण करने के लिए बनाया गया था। हम आपकी शिक्षण सामग्री का विश्लेषण करने और वास्तविक परीक्षा जैसा महसूस कराने वाले कस्टम अभ्यास वातावरण बनाने के लिए अत्याधुनिक जनरेटिव AI का उपयोग करते हैं।',
      feat1Title: 'वास्तविक समय अखंडता',
      feat1Text: 'हमारा "ऑटो-डिटेक्शन" सिस्टम टेस्ट के दौरान फोकस की निगरानी करता है, जिससे एक व्याकुलता-मुक्त अभ्यास सत्र सुनिश्चित होता है जो वास्तविक परीक्षा प्रोक्टरिंग की नकल करता है।',
      feat2Title: 'विषय गहन विश्लेषण',
      feat2Text: 'सिर्फ स्कोर न पाएं। हमारे रडार-चार्ट एनालिटिक्स आपको दिखाते हैं कि आपने किन विषयों में महारत हासिल की है और आपको कहां अधिक समय बिताने की आवश्यकता है।',
      langRulesTitle: 'भाषा बुद्धिमत्ता',
      langRulesText: 'हमारा AI आपकी सामग्री के अनुसार स्वचालित रूप से अनुकूलित हो जाता है:',
      langRule1: '• हिंदी PDF → हिंदी मॉक टेस्ट',
      langRule2: '• अंग्रेजी PDF → अंग्रेजी मॉक टेस्ट',
      langRule3: '• द्विभाषी PDF → दोनों भाषाओं में टेस्ट',
      poweredBy: 'द्वारा संचालित',
      backHome: 'होम पर वापस जाएं'
    },
    profile: {
      title: 'मेरी प्रोफ़ाइल',
      settings: 'प्रोफ़ाइल सेटिंग्स',
      firstName: 'पहला नाम',
      lastName: 'अंतिम नाम',
      password: 'पासवर्ड अपडेट करें',
      passwordPlaceholder: 'नया पासवर्ड दर्ज करें (वैकल्पिक)',
      passwordGuest: 'अतिथि खातों के लिए उपलब्ध नहीं है',
      save: 'परिवर्तन सहेजें',
      guestWarning: 'आप एक अतिथि खाते का उपयोग कर रहे हैं। अपने इतिहास को सभी उपकरणों में सिंक करने के लिए साइन अप करें!',
      quickIcons: 'त्वरित आइकन'
    },
    generating: {
      title: 'आपकी स्थायी परीक्षा उत्पन्न की जा रही है',
      subtitle: 'ExamAI आपकी सामग्री का विश्लेषण कर रहा है और एक उच्च गुणवत्ता वाला टेस्ट बना रहा है जो आपके डैशबोर्ड पर जीवन भर के लिए सहेजा जाएगा।',
      progress: '{current} में से {total} प्रश्न उत्पन्न किए गए...',
      failed: 'जेनरेशन विफल रहा',
      back: 'डैशबोर्ड पर वापस जाएं'
    },
    ready: {
      title: 'परीक्षा तैयार है!',
      subtitle: 'आपका कस्टम टेस्ट "{title}" सफलतापूर्वक उत्पन्न हो गया है और आपकी लाइब्रेरी में सहेज लिया गया है।',
      questions: 'प्रश्न',
      duration: 'अवधि',
      start: 'अभी परीक्षा शुरू करें',
      back: 'डैशबोर्ड पर वापस जाएं'
    },
    test: {
      timer: '⏱️ {time}',
      questionOf: 'प्रश्न {current} कुल {total}',
      warning: '⚠️ चेतावनी: ध्यान भटक गया!',
      submit: 'अंतिम परीक्षा जमा करें',
      hint: '💡 संकेत प्राप्त करें',
      hideHint: '💡 संकेत छिपाएं',
      hintLabel: 'संकेत:',
      prev: '← पिछला',
      next: 'अगला प्रश्न →',
      end: 'परीक्षा का अंत',
      navigator: 'प्रश्न नेविगेटर'
    },
    results: {
      performance: 'प्रदर्शन',
      accuracy: 'सटीकता',
      correct: 'सही',
      incorrect: 'गलत',
      completed: 'परीक्षा पूरी हुई',
      effort: 'शानदार प्रयास!',
      proficiency: 'विषय दक्षता',
      stats: 'निष्पादन आँकड़े',
      timeTaken: 'लिया गया समय',
      anomalies: 'विसंगतियाँ',
      pace: 'गति',
      retake: 'फिर से परीक्षा दें',
      review: 'विस्तृत समीक्षा',
      solution: 'समाधान और स्पष्टीकरण'
    }
  }
};
