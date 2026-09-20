import React, { useState, useEffect } from 'react';
import { 
  Home, 
  BookOpen, 
  Newspaper, 
  User, 
  Sparkles, 
  ShoppingBag, 
  Bookmark, 
  ShieldCheck, 
  FileText, 
  Youtube,
  ChevronDown,
  Building2,
  Scale,
  Landmark,
  LogOut,
  Trophy,
  Info,
  Crown,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavigationTab, QuizSubCategory } from '../../types';
import { SocialLinksBar } from '../common/SocialIcons';
import { StorageService } from '../../services/storageService';
import { isOwnerAdmin } from '../../utils/sanitizer';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    user, 
    purchases, 
    bookmarks, 
    logout, 
    quizSubCategory, 
    selectQuizSubCategory,
    openLevelDashboard
  } = useApp();

  // Force immediate re-render when auth changes
  const [, setForceUpdate] = useState(0);
  useEffect(() => {
    const handleAuthEvent = () => setForceUpdate(n => n + 1);
    window.addEventListener('btn:profile-updated', handleAuthEvent);
    window.addEventListener('btn:user-login', handleAuthEvent);
    window.addEventListener('btn:logout', handleAuthEvent);
    return () => {
      window.removeEventListener('btn:profile-updated', handleAuthEvent);
      window.removeEventListener('btn:user-login', handleAuthEvent);
      window.removeEventListener('btn:logout', handleAuthEvent);
    };
  }, []);

  // Check if current user is an owner admin (strictly nvisit9@gmail.com & ketohero412@gmail.com)
  const isOwner = Boolean(
    (user?.email && isOwnerAdmin(user.email)) || 
    (typeof window !== 'undefined' && isOwnerAdmin(StorageService.getUserProfile()?.email))
  );

  // Expand state for the 3 primary categories highlight cards
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    sangathit: true,
    banking: true,
    loksewa: true
  });

  const toggleCategoryExpand = (catKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const [selectedInst, setSelectedInst] = useState<'NRB' | 'Commercial' | 'EPF' | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<'paper-1' | 'paper-2' | null>('paper-1');
  const [expandedCommercialLevel, setExpandedCommercialLevel] = useState<'level-4-5' | 'level-6' | null>('level-4-5');

  const handleLogout = () => {
    if (window.confirm('के तपाईं लगआउट गर्न चाहनुहुन्छ? लगआउट गरेपछि नयाँ प्रोफाइल खोल्न सकिनेछ।')) {
      logout();
    }
  };

  const handleSelectCourseSection = (
    courseId: string, 
    options?: { paperId?: string; sectionId?: string; levelId?: string; subjectId?: string }
  ) => {
    setActiveTab('courses');
    window.dispatchEvent(
      new CustomEvent('btn:select-syllabus-section', {
        detail: { courseId, ...options }
      })
    );
  };

  // Primary category configuration with Bold Typography, Background Highlight Cards & Indented Sub-links
  const primaryCategoriesConfig = [
    {
      key: 'sangathit' as QuizSubCategory,
      dashCatId: 'enterprises',
      label: '१. संगठित संस्था',
      englishLabel: 'Public Enterprises',
      badge: '५० सेट',
      icon: Building2,
      accentColor: 'text-red-600 dark:text-red-400',
      activeBg: 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800/70 text-red-950 dark:text-red-100',
      badgeClass: 'bg-red-600 text-white',
      subLinks: [
        { label: 'तह ४: सहायक (Assistant)', onClick: () => openLevelDashboard('enterprises', '4', 0), badge: 'तह ४' },
        { label: 'तह ५: वरिष्ठ सहायक (Sr. Assistant)', onClick: () => openLevelDashboard('enterprises', '5', 0), badge: 'तह ५' },
        { label: 'तह ६: अधिकृत (Officer Level)', onClick: () => openLevelDashboard('enterprises', '6', 0), badge: 'तह ६' },
        { label: 'कर्मचारी सञ्चय कोष (EPF) विशेष', onClick: () => handleSelectCourseSection('EPF', { levelId: 'epf-level-4-5-6' }) },
        { label: '५० प्रश्न विशेष सिमुलेसन सेट', onClick: () => openLevelDashboard('enterprises', '4', 2), badge: 'Live' }
      ]
    },
    {
      key: 'banking' as QuizSubCategory,
      dashCatId: 'banking',
      label: '२. बैंकिङ्ग सेवा',
      englishLabel: 'Banking Services',
      badge: '४ बैंक',
      icon: Landmark,
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100',
      badgeClass: 'bg-emerald-600 text-white',
      subLinks: [
        { label: 'तह ४: सहायक (NRB, RBB, ADBL)', onClick: () => openLevelDashboard('banking', '4', 0), badge: 'तह ४' },
        { label: 'तह ५: वरिष्ठ सहायक (Sr. Assistant)', onClick: () => openLevelDashboard('banking', '5', 0), badge: 'तह ५' },
        { label: 'तह ६: अधिकृत (Officer Level)', onClick: () => openLevelDashboard('banking', '6', 0), badge: 'तह ६' },
        { label: 'नेपाल राष्ट्र बैंक (NRB) पाठ्यक्रम', onClick: () => handleSelectCourseSection('NRB') },
        { label: 'वाणिज्य बैंकहरू (Commercial Banks)', onClick: () => handleSelectCourseSection('Commercial', { levelId: 'level-4-5' }) }
      ]
    },
    {
      key: 'loksewa' as QuizSubCategory,
      dashCatId: 'loksewa',
      label: '३. निजामती / लोकसेवा',
      englishLabel: 'Civil Service / Loksewa',
      badge: 'लोकसेवा',
      icon: Scale,
      accentColor: 'text-amber-600 dark:text-amber-400',
      activeBg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100',
      badgeClass: 'bg-amber-600 text-white',
      subLinks: [
        { label: 'तह ४: खरिदार (Kharidar Level)', onClick: () => openLevelDashboard('loksewa', '4', 0), badge: 'तह ४' },
        { label: 'तह ५: नायब सुब्बा (NaSu Level)', onClick: () => openLevelDashboard('loksewa', '5', 0), badge: 'तह ५' },
        { label: 'तह ६: शाखा अधिकृत (Officer Level)', onClick: () => openLevelDashboard('loksewa', '6', 0), badge: 'तह ६' },
        { label: 'प्रथम पत्र: GK & IQ वस्तुगत', onClick: () => openLevelDashboard('loksewa', '4', 1), badge: 'MCQ' }
      ]
    }
  ];

  const primaryNavItems: { tab: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tab: 'home', label: 'गृहपृष्ठ (Home)', icon: Home },
    { tab: 'courses', label: 'पाठ्यक्रम (Courses & Curriculum)', icon: BookOpen }
  ];

  const resourceNavItems: { tab: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { tab: 'leaderboard', label: 'वरियता (Leaderboard)', icon: Trophy, badge: 'Ranking', badgeColor: 'bg-amber-500' },
    { tab: 'video-lectures', label: 'भिडियो कक्षाहरू (Videos)', icon: Youtube, badge: 'HD', badgeColor: 'bg-red-600' },
    { tab: 'free-notes', label: 'अध्ययन / AI नोट्स (Notes)', icon: FileText, badge: 'AI', badgeColor: 'bg-blue-600' },
    { tab: 'current-affairs', label: 'समसामयिक (Current Affairs)', icon: Newspaper },
    { tab: 'premium', label: 'प्रिमियम नोट्स (Premium)', icon: Sparkles, badge: 'Pro', badgeColor: 'bg-amber-500' },
    { tab: 'purchases', label: 'मेरो खरिद (My Purchases)', icon: ShoppingBag, badge: (purchases || []).length },
    { tab: 'bookmarks', label: 'बुकमार्क (Bookmarks)', icon: Bookmark, badge: (bookmarks || []).length },
    { tab: 'profile', label: 'मेरो प्रोफाइल (Profile)', icon: User },
    { tab: 'about', label: 'हाम्रो बारेमा (About Us)', icon: Info, badge: 'EdTech', badgeColor: 'bg-blue-600' }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 h-screen sticky top-0 transition-colors z-20">
      
      {/* Sidebar Header / Brand Logo */}
      <div 
        id="sidebar-brand-logo"
        onClick={() => setActiveTab('home')}
        className="p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all"
        title="Banking Tayari Nepal - Home"
      >
        <div className="w-full bg-white px-3 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs group-hover:shadow-xs group-hover:border-blue-300 transition-all flex items-center justify-center">
          <img 
            src="/logo.svg" 
            alt="Banking Tayari Nepal Logo" 
            className="h-11 w-auto object-contain select-none"
          />
        </div>
      </div>

      {/* Navigation List with Generous Spacing & Clean Hierarchy */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        
        {/* Section 1: Main Primary Navigation */}
        <nav className="space-y-1">
          {primaryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;

            return (
              <button
                key={item.tab}
                id={`sidebar-nav-${item.tab}`}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs font-bold ${
                  isActive 
                    ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/25' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`} />
                  <span className="truncate" title={item.label}>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Section 2: BOLD & INTUITIVE PRIMARY CATEGORY HIGHLIGHT CARDS & INDENTED SUB-LINKS */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="px-1.5 py-1 flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              १. प्रमुख परीक्षा तथा तयारी क्षेत्रहरू
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              ३ क्षेत्र
            </span>
          </div>

          <div className="space-y-2.5">
            {primaryCategoriesConfig.map(cat => {
              const Icon = cat.icon;
              const isSelected = activeTab === 'quiz' && quizSubCategory === cat.key;
              const isExpanded = expandedCategories[cat.key] ?? true;

              return (
                <div 
                  key={cat.key}
                  className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? cat.activeBg
                      : 'bg-slate-50/90 dark:bg-slate-850/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Primary Category Title Header Card */}
                  <div
                    onClick={() => {
                      selectQuizSubCategory(cat.key);
                      openLevelDashboard(cat.dashCatId, '4', 0);
                    }}
                    className="p-2.5 sm:p-3 flex items-center justify-between cursor-pointer select-none group"
                    title={`${cat.label} - ${cat.englishLabel}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                      <div className={`p-1.5 rounded-xl shrink-0 transition ${
                        isSelected 
                          ? 'bg-white dark:bg-slate-900 shadow-xs' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
                      }`}>
                        <Icon className={`w-4 h-4 ${cat.accentColor}`} />
                      </div>
                      <div className="min-w-0 truncate">
                        <h4 className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-white truncate leading-tight tracking-tight">
                          {cat.label}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
                          {cat.englishLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs ${cat.badgeClass}`}>
                        {cat.badge}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleCategoryExpand(cat.key, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                        title="सब-लिंक खोल्नुहोस् / बन्द गर्नुहोस्"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Indented Sub-Links with Clean Typography */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-0.5">
                      <div className="ml-3.5 pl-3 border-l-2 border-slate-200 dark:border-slate-700/80 space-y-1 mt-1">
                        {cat.subLinks.map((sub, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sub.onClick();
                            }}
                            className="w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-600 shrink-0 transition" />
                              <span className="truncate text-[11px] sm:text-xs">{sub.label}</span>
                            </div>

                            {sub.badge && (
                              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 group-hover:text-blue-600 shrink-0">
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Learning Resources & Tools */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="px-1.5 py-1 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              २. अध्ययन स्रोत तथा सुविधाहरू
            </span>
          </div>

          <nav className="space-y-1">
            {resourceNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;

              return (
                <button
                  key={item.tab}
                  id={`sidebar-resource-${item.tab}`}
                  onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-xs font-bold ${
                    isActive 
                      ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/25' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`} />
                    <span className="truncate" title={item.label}>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : item.badgeColor 
                          ? `${item.badgeColor} text-white` 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Owner Exclusive Admin Panel Tab (Restricted strictly to nvisit9@gmail.com and ketohero412@gmail.com) */}
          {isOwner && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40">
              <div className="px-1.5 py-1 flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  प्रशासक प्यानल (Owner)
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white animate-pulse">
                  OWNER
                </span>
              </div>
              <button
                type="button"
                id="sidebar-admin-panel-btn"
                onClick={() => {
                  setActiveTab('admin');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({ tab: 'admin' }, '', '/admin');
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs font-black cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/25'
                    : 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/50'
                }`}
                title="Admin Analytics Dashboard"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'admin' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                  <span className="truncate">Admin Panel (एनालिटिक्स)</span>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  activeTab === 'admin' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                }`}>
                  Live
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Section 4: Detailed Bank Syllabus Accordion */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="px-1.5 py-1 flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                ३. बैंक विस्तृत पाठ्यक्रम
              </span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              विस्तृत
            </span>
          </div>

          <div className="space-y-1.5 text-xs mt-1.5">
            {/* 1. नेपाल राष्ट्र बैंक (NRB) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/60 dark:bg-slate-850/40">
              <button
                type="button"
                onClick={() => {
                  setSelectedInst(selectedInst === 'NRB' ? null : 'NRB');
                  handleSelectCourseSection('NRB');
                }}
                className={`w-full p-2 text-left font-bold flex items-center justify-between transition ${
                  selectedInst === 'NRB'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[11px] font-black leading-tight">नेपाल राष्ट्र बैंक (NRB)</span>
                    <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">तह ४ (सहायक - Active)</span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${selectedInst === 'NRB' ? 'rotate-180' : ''}`} />
              </button>

              {selectedInst === 'NRB' && (
                <div className="p-1.5 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/40">
                  {/* Paper I Accordion */}
                  <div className="rounded-lg border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedPaper(expandedPaper === 'paper-1' ? null : 'paper-1')}
                      className="w-full px-2 py-1.5 text-left font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px]"
                    >
                      <span className="truncate">Paper I: Banking, Accounting, Math, IT</span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${expandedPaper === 'paper-1' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedPaper === 'paper-1' && (
                      <div className="p-1 space-y-0.5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
                        {[
                          { id: 'nrb-p1-sec-a', name: 'खण्ड क: बैंकिङ (Banking)', marks: '35m' },
                          { id: 'nrb-p1-sec-b', name: 'खण्ड ख: लेखा (Accounting)', marks: '30m' },
                          { id: 'nrb-p1-sec-c', name: 'खण्ड ग: गणित (Mathematics)', marks: '20m' },
                          { id: 'nrb-p1-sec-d', name: 'खण्ड घ: IT प्रविधि (Info Tech)', marks: '15m' }
                        ].map(sec => (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelectCourseSection('NRB', { paperId: 'paper-1', sectionId: sec.id })}
                            className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10.5px] text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition font-medium"
                          >
                            <span className="truncate">{sec.name}</span>
                            <span className="text-[9px] font-bold px-1 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                              {sec.marks}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Paper II Accordion */}
                  <div className="rounded-lg border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedPaper(expandedPaper === 'paper-2' ? null : 'paper-2')}
                      className="w-full px-2 py-1.5 text-left font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px]"
                    >
                      <span className="truncate">Paper II: Economics, Management, Laws</span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${expandedPaper === 'paper-2' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedPaper === 'paper-2' && (
                      <div className="p-1 space-y-0.5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
                        {[
                          { id: 'nrb-p2-sec-a', name: 'खण्ड क: अर्थशास्त्र (Economics)', marks: '30m' },
                          { id: 'nrb-p2-sec-b', name: 'खण्ड ख: व्यवस्थापन (Management)', marks: '25m' },
                          { id: 'nrb-p2-sec-c', name: 'खण्ड ग: कानुन तथा ऐनहरू (Laws)', marks: '30m' },
                          { id: 'nrb-p2-sec-d', name: 'खण्ड घ: संविधान र सुशासन', marks: '15m' }
                        ].map(sec => (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelectCourseSection('NRB', { paperId: 'paper-2', sectionId: sec.id })}
                            className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10.5px] text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition font-medium"
                          >
                            <span className="truncate">{sec.name}</span>
                            <span className="text-[9px] font-bold px-1 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                              {sec.marks}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. वाणिज्य बैंकहरू (Commercial Banks) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/60 dark:bg-slate-850/40">
              <button
                type="button"
                onClick={() => {
                  setSelectedInst(selectedInst === 'Commercial' ? null : 'Commercial');
                  handleSelectCourseSection('Commercial');
                }}
                className={`w-full p-2 text-left font-bold flex items-center justify-between transition ${
                  selectedInst === 'Commercial'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[11px] font-black leading-tight">वाणिज्य बैंकहरू (RBB, ADBL, NBL)</span>
                    <span className="block text-[10px] text-blue-700 dark:text-blue-400 font-semibold">तह ४, ५ र ६ एकीकृत</span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${selectedInst === 'Commercial' ? 'rotate-180' : ''}`} />
              </button>

              {selectedInst === 'Commercial' && (
                <div className="p-1.5 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => handleSelectCourseSection('Commercial', { levelId: 'level-4-5' })}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition"
                  >
                    <span>तह ४ र ५ (सहायक / वरिष्ठ सहायक)</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCourseSection('Commercial', { levelId: 'level-6' })}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition"
                  >
                    <span>तह ६ (अधिकृत स्तर - Officer)</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. कर्मचारी सञ्चय कोष (EPF) */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/60 dark:bg-slate-850/40">
              <button
                type="button"
                onClick={() => {
                  setSelectedInst(selectedInst === 'EPF' ? null : 'EPF');
                  handleSelectCourseSection('EPF', { levelId: 'epf-level-4-5-6' });
                }}
                className={`w-full p-2 text-left font-bold flex items-center justify-between transition ${
                  selectedInst === 'EPF'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[11px] font-black leading-tight">कर्मचारी सञ्चय कोष (EPF)</span>
                    <span className="block text-[10px] text-purple-700 dark:text-purple-400 font-semibold">तह ४, ५ र ६ पाठ्यक्रम</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* User Session Footer Card */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <SocialLinksBar />

        {user ? (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div 
              onClick={() => setActiveTab('profile')}
              className="flex items-center space-x-2 min-w-0 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                  {user.displayName || user.email?.split('@')[0] || 'विद्यार्थी'}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-semibold">
                  {user.targetExam?.split('-')[0] || 'NRB / Banking'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
              title="लगआउट गर्नुहोस्"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-2 text-center">
            <button
              onClick={() => setActiveTab('profile')}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>लगइन / नयाँ खाता</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
