export type AppLanguage = 'ne' | 'en';

export interface CategoryInfo {
  id: string;
  nameNe: string;
  nameEn: string;
  descriptionNe: string;
  descriptionEn: string;
  icon: string;
  badgeNe: string;
  badgeEn: string;
  institutions: {
    id: string;
    code: string;
    nameNe: string;
    nameEn: string;
    levels: ('4' | '5' | '6')[];
  }[];
}

export const PRIMARY_CATEGORIES: CategoryInfo[] = [
  {
    id: 'banking',
    nameNe: 'बैंकिङ क्षेत्र',
    nameEn: 'Banking Sector',
    descriptionNe: 'नेपालका केन्द्रीय तथा ' + 'वाणिज्य बैंकहरूको पाठ्यक्रम, वस्तुगत प्रश्न र विशेष परीक्षा सेट',
    descriptionEn: 'Official syllabus, MCQs and mock tests for Central & Commercial Banks',
    icon: 'Landmark',
    badgeNe: 'NRB, RBB, NBL, ADBL',
    badgeEn: 'NRB, RBB, NBL, ADBL',
    institutions: [
      { id: 'nrb', code: 'NRB', nameNe: 'नेपाल राष्ट्र बैंक', nameEn: 'Nepal Rastra Bank', levels: ['4', '5', '6'] },
      { id: 'rbb', code: 'RBB', nameNe: 'राष्ट्रिय वाणिज्य बैंक', nameEn: 'Rastriya Banijya Bank', levels: ['4', '5', '6'] },
      { id: 'nbl', code: 'NBL', nameNe: 'नेपाल बैंक लिमिटेड', nameEn: 'Nepal Bank Limited', levels: ['4', '5', '6'] },
      { id: 'adbl', code: 'ADBL', nameNe: 'कृषि विकास बैंक', nameEn: 'Agricultural Development Bank', levels: ['4', '5', '6'] },
    ]
  },
  {
    id: 'enterprises',
    nameNe: 'संस्थान तथा संगठित संस्था',
    nameEn: 'Public Enterprises',
    descriptionNe: 'दूरसञ्चार, विद्युत, सञ्चय कोष र नागरिक लगानी कोषको एकीकृत ५० सेट र पाठ्यक्रम',
    descriptionEn: 'Unified 50 test sets and curriculum for Telecom, Electricity, Provident Fund & CIT',
    icon: 'Building2',
    badgeNe: 'NTC, NEA, EPF, CIT',
    badgeEn: 'NTC, NEA, EPF, CIT',
    institutions: [
      { id: 'ntc', code: 'NTC', nameNe: 'नेपाल टेलिकम (ने.दू.सं.)', nameEn: 'Nepal Telecom (NTC)', levels: ['4', '5', '6'] },
      { id: 'nea', code: 'NEA', nameNe: 'नेपाल विद्युत प्राधिकरण', nameEn: 'Nepal Electricity Authority (NEA)', levels: ['4', '5', '6'] },
      { id: 'epf', code: 'EPF', nameNe: 'कर्मचारी सञ्चय कोष', nameEn: 'Employees Provident Fund (EPF)', levels: ['4', '5', '6'] },
      { id: 'cit', code: 'CIT', nameNe: 'नागरिक लगानी कोष', nameEn: 'Citizen Investment Trust (CIT)', levels: ['4', '5', '6'] },
    ]
  },
  {
    id: 'loksewa',
    nameNe: 'लोकसेवा आयोग',
    nameEn: 'Lok Sewa / Civil Service',
    descriptionNe: 'निजामती सेवा (प्रशासन र न्याय): खरिदार, नायब सुब्बा तथा शाखा अधिकृत पूर्ण तयारी',
    descriptionEn: 'Civil Service: Kharidar, NaSu & Section Officer syllabus & exam tests',
    icon: 'Scale',
    badgeNe: 'खरिदार, नासु, अधिकृत',
    badgeEn: 'Kharidar, NaSu, Officer',
    institutions: [
      { id: 'kharidar', code: 'Kharidar', nameNe: 'खरिदार (तह ४)', nameEn: 'Kharidar (Level 4)', levels: ['4'] },
      { id: 'nasu', code: 'NaSu', nameNe: 'नायब सुब्बा (तह ५)', nameEn: 'Nayab Subba (Level 5)', levels: ['5'] },
      { id: 'officer', code: 'Officer', nameNe: 'शाखा अधिकृत (तह ६/७)', nameEn: 'Section Officer (Level 6/7)', levels: ['6'] },
    ]
  }
];

export const LEVEL_DEFINITIONS = [
  {
    level: '4' as const,
    labelNe: 'तह ४ (सहायक / Assistant)',
    shortLabelNe: 'तह ४',
    labelEn: 'Level 4 (Assistant)',
    shortLabelEn: 'Level 4',
    subLabelNe: 'प्रवेश तह / सहायक पद',
    subLabelEn: 'Entry Level / Assistant Post',
    minEduNe: '१०+२ वा सो सरह उत्तीर्ण',
    minEduEn: '10+2 / Higher Secondary Pass',
    totalMarks: 200,
    timeFirstPaper: '४५ मिनेट (MCQs)',
    timeSecondPaper: '३ घण्टा (Subjective)'
  },
  {
    level: '5' as const,
    labelNe: 'तह ५ (वरिष्ठ सहायक / Supervisor)',
    shortLabelNe: 'तह ५',
    labelEn: 'Level 5 (Senior Assistant)',
    shortLabelEn: 'Level 5',
    subLabelNe: 'सुपरभाइजर / वरिष्ठ सहायक',
    subLabelEn: 'Supervisor / Senior Assistant',
    minEduNe: 'प्रवीणता प्रमाणपत्र तह वा स्नातक',
    minEduEn: 'Bachelor / Proficiency Certificate',
    totalMarks: 200,
    timeFirstPaper: '४५ मिनेट (MCQs)',
    timeSecondPaper: '३ घण्टा (Subjective)'
  },
  {
    level: '6' as const,
    labelNe: 'तह ६ (अधिकृत / Officer)',
    shortLabelNe: 'तह ६',
    labelEn: 'Level 6 (Officer)',
    shortLabelEn: 'Level 6',
    subLabelNe: 'अधिकृत स्तर / तृतीय श्रेणी',
    subLabelEn: 'Officer Level / Class III',
    minEduNe: 'मान्यता प्राप्त विश्वविद्यालयबाट स्नातक',
    minEduEn: 'Bachelor Degree or Masters',
    totalMarks: 300,
    timeFirstPaper: '१ घण्टा (MCQs & Case Study)',
    timeSecondPaper: '३ घण्टा (Subjective)'
  }
];

export const TRANSLATIONS = {
  ne: {
    // Header & Navigation
    appName: 'बैंकिङ तयारी नेपाल',
    appSubtitle: 'राष्ट्रिय स्तरको परीक्षा तयारी पोर्टल',
    home: 'गृहपृष्ठ',
    courses: 'पाठ्यक्रम',
    publicEnterprises: 'संस्थान ५० सेट',
    notes: 'अध्ययन नोट्स',
    videos: 'भिडियो कक्षाहरू',
    currentAffairs: 'समसामयिक',
    leaderboard: 'वरियता',
    about: 'हाम्रो बारेमा',
    admin: 'व्यवस्थापक',
    login: 'लगइन',
    logout: 'लगआउट',
    profile: 'मेरो प्रोफाइल',
    searchPlaceholder: 'के खोज्दै हुनुहुन्छ? (खोज्नुहोस् पाठ्यक्रम, ऐन, MCQs...)',
    toggleLang: 'English',
    activeLangBadge: 'नेपाली',

    // Primary Categories
    categoriesTitle: 'प्रमुख परीक्षा क्षेत्रहरू (Primary Categories)',
    categoriesSubtitle: 'आफ्नो लक्षित संस्थान वा सेवा छनोट गरी तहगत पाठ्यक्रम र परीक्षा सेट अभ्यास गर्नुहोस्',
    bankingSector: 'बैंकिङ क्षेत्र',
    publicEnterprisesSec: 'संस्थान तथा संगठित संस्था',
    civilService: 'लोकसेवा आयोग',

    // Level Selector Modal & Cards
    levelSelectorTitle: 'तहगत अन्तरक्रियात्मक ड्यासबोर्ड',
    levelSelectorSubtitle: 'तह ४, ५ र ६ को आधिकारिक पाठ्यक्रम, १०,०००+ प्रश्न भण्डार र परीक्षा सिमुलेसन',
    level4: 'तह ४',
    level5: 'तह ५',
    level6: 'तह ६',
    selectLevel: 'तह छनोट गर्नुहोस्:',
    selectCategory: 'क्षेत्र छनोट गर्नुहोस्:',
    selectInstitution: 'संस्थान / पद:',

    // 4 Tabs
    tabSyllabus: 'पाठ्यक्रम विश्लेषण',
    tabQuestions: 'प्रश्न भण्डार (View-Only)',
    tabMockTest: 'अनलाइन परीक्षा & अभ्यास',
    tabProgress: 'प्रगति ट्र्याकर',

    // Tab 1: Syllabus Breakdown
    paper1Title: 'प्रथम पत्र: सामान्य ज्ञान, बौद्धिक परीक्षण, ऐन तथा कानून',
    paper1Weightage: 'पूर्णाङ्क: १०० • उत्तीर्णाङ्क: ४० • ५० बहुवैकल्पिक प्रश्न (MCQs) • समय: ४५ मिनेट',
    paper2Title: 'द्वितीय पत्र: विषयगत (बैंकिङ, लेखा, व्यवस्थापन, कम्प्युटर र अर्थशास्त्र)',
    paper2Weightage: 'पूर्णाङ्क: १०० • उत्तीर्णाङ्क: ४० • विषयगत प्रश्नहरू (१० x ५ र ५ x १०) • समय: ३ घण्टा',
    marksDistTitle: 'अंकभार वितरण (Mark Distribution)',
    readNoteBtn: 'सम्बन्धित नोट पढ्नुहोस्',

    // Tab 2: Question Bank (View-Only)
    viewOnlyNotice: 'अनलाइन अभ्यास मोड (View-Only Practice) • १०,०००+ प्रश्न भण्डार',
    showAnswer: 'उत्तर र व्याख्या हेर्नुहोस्',
    hideAnswer: 'उत्तर लुकाउनुहोस्',
    filterByTopic: 'विषय अनुसार फिल्टर:',
    allTopics: 'सबै विषयहरू',
    difficultyEasy: 'सजिलो',
    difficultyMedium: 'मध्यम',
    difficultyHard: 'कठिन',

    // Tab 3: Mock Test
    startMockTestBtn: 'तत्काल परीक्षा सुरु गर्नुहोस् (Start Test)',
    testDuration: 'समय: ४५ मिनेट',
    testQuestionsCount: '५० प्रश्नहरू • नेगेटिभ मार्किङ (-२०%)',
    testInstruction: 'वास्तविक लोकसेवा/बैंकिङ परीक्षा सिमुलेसन, स्वचालित मूल्याङ्कन र तत्काल नतिजा।',

    // Tab 4: Progress Tracker
    syllabusProgressTitle: 'पाठ्यक्रम अध्ययन प्रगति',
    completedTopics: 'अध्ययन पूरा भएका शीर्षकहरू',
    remainingTopics: 'बाँकी अध्ययन शीर्षकहरू',
    overallProgress: 'समग्र प्रगति',
    markCompleted: 'पूरा भयो',
    markIncomplete: 'अपूर्ण',

    // Admin & Alerts
    adminOnlyPdf: 'A4 PDF निर्यात केवल आधिकारिक व्यवस्थापकका लागि मात्र सुरक्षित छ।',
    openDashboard: 'विस्तृत ड्यासबोर्ड खोल्नुहोस्',
    close: 'बन्द गर्नुहोस्',
    exploreNow: 'अध्ययन सुरु गर्नुहोस्',
    freeBadge: 'निःशुल्क अनलाइन पहुँच'
  },
  en: {
    // Header & Navigation
    appName: 'Banking Tayari Nepal',
    appSubtitle: 'National Level Exam Preparation Portal',
    home: 'Home',
    courses: 'Syllabus & Courses',
    publicEnterprises: 'Enterprises 50 Sets',
    notes: 'Study Notes',
    videos: 'Video Lectures',
    currentAffairs: 'Current Affairs',
    leaderboard: 'Leaderboard',
    about: 'About Us',
    admin: 'Admin CMS',
    login: 'Login',
    logout: 'Logout',
    profile: 'My Profile',
    searchPlaceholder: 'Search syllabus, banking acts, 10k+ MCQs...',
    toggleLang: 'नेपाली',
    activeLangBadge: 'English',

    // Primary Categories
    categoriesTitle: 'Primary Examination Categories',
    categoriesSubtitle: 'Select your target sector and institution for tier-based syllabus & live tests',
    bankingSector: 'Banking Sector',
    publicEnterprisesSec: 'Public Enterprises',
    civilService: 'Lok Sewa / Civil Service',

    // Level Selector Modal & Cards
    levelSelectorTitle: 'Interactive Level Dashboard',
    levelSelectorSubtitle: 'Official Level 4, 5 & 6 Curriculum, 10,000+ Question Bank & Test Simulations',
    level4: 'Level 4',
    level5: 'Level 5',
    level6: 'Level 6',
    selectLevel: 'Select Tier / Level:',
    selectCategory: 'Select Sector:',
    selectInstitution: 'Institution / Role:',

    // 4 Tabs
    tabSyllabus: 'Syllabus Breakdown',
    tabQuestions: 'Question Bank (View-Only)',
    tabMockTest: 'Mock Test & Practice',
    tabProgress: 'Progress Tracker',

    // Tab 1: Syllabus Breakdown
    paper1Title: 'Paper I: General Knowledge, IQ, Banking Acts & Regulations',
    paper1Weightage: 'Full Marks: 100 • Pass Marks: 40 • 50 MCQs • Time: 45 Minutes',
    paper2Title: 'Paper II: Subjective (Banking, Accounting, Management, IT & Economics)',
    paper2Weightage: 'Full Marks: 100 • Pass Marks: 40 • Subjective Analytical (10x5 & 5x10) • Time: 3 Hours',
    marksDistTitle: 'Official Mark Distribution',
    readNoteBtn: 'Read Topic Note',

    // Tab 2: Question Bank (View-Only)
    viewOnlyNotice: 'Interactive Online Practice (View-Only Mode) • 10,000+ Question Bank',
    showAnswer: 'Show Answer & Detailed Explanation',
    hideAnswer: 'Hide Answer',
    filterByTopic: 'Filter by Subject:',
    allTopics: 'All Subjects',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',

    // Tab 3: Mock Test
    startMockTestBtn: 'Start Live Simulation Test',
    testDuration: 'Duration: 45 Mins',
    testQuestionsCount: '50 Questions • Negative Marking (-20%)',
    testInstruction: 'Real-time PSC / Banking exam environment, automatic grading and instant analytics.',

    // Tab 4: Progress Tracker
    syllabusProgressTitle: 'Syllabus Completion Tracker',
    completedTopics: 'Completed Topics',
    remainingTopics: 'Remaining Topics',
    overallProgress: 'Overall Completion',
    markCompleted: 'Completed',
    markIncomplete: 'Incomplete',

    // Admin & Alerts
    adminOnlyPdf: 'Official A4 PDF export is strictly reserved for verified administrators.',
    openDashboard: 'Open Level Dashboard',
    close: 'Close',
    exploreNow: 'Start Learning',
    freeBadge: 'Free Online Access'
  }
};
