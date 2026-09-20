import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Layers, 
  PlayCircle, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  GraduationCap, 
  BarChart3, 
  Building2, 
  Landmark, 
  Scale,
  Clock,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRIMARY_CATEGORIES, LEVEL_DEFINITIONS } from '../../utils/translations';
import { 
  LEVEL_SYLLABUS_DATABASE, 
  getSyllabusProgress,
  generateLevelMockTestSet
} from '../../data/levelDashboardData';

interface LevelSelectorCardProps {
  className?: string;
}

export const LevelSelectorCard: React.FC<LevelSelectorCardProps> = ({ className = '' }) => {
  const { language, openLevelDashboard, startQuiz } = useApp();

  const [selectedCatId, setSelectedCatId] = useState<string>('banking');
  const [selectedLevel, setSelectedLevel] = useState<'4' | '5' | '6'>('4');

  const currentCategory = useMemo(() => {
    return PRIMARY_CATEGORIES.find(c => c.id === selectedCatId) || PRIMARY_CATEGORIES[0];
  }, [selectedCatId]);

  const categorySyllabus = useMemo(() => {
    return LEVEL_SYLLABUS_DATABASE[selectedCatId] || LEVEL_SYLLABUS_DATABASE.banking;
  }, [selectedCatId]);

  const levelData = useMemo(() => {
    return categorySyllabus.levels.find(l => l.level === selectedLevel) || categorySyllabus.levels[0];
  }, [categorySyllabus, selectedLevel]);

  const levelMeta = useMemo(() => {
    return LEVEL_DEFINITIONS.find(d => d.level === selectedLevel) || LEVEL_DEFINITIONS[0];
  }, [selectedLevel]);

  const progress = useMemo(() => {
    return getSyllabusProgress(selectedCatId, selectedLevel);
  }, [selectedCatId, selectedLevel]);

  const progressPercentage = useMemo(() => {
    const total = levelData.totalTopics || 10;
    const completed = progress.completedTopicIds.length;
    return Math.min(100, Math.round((completed / total) * 100));
  }, [levelData, progress]);

  const handleLaunchMock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mockSet = generateLevelMockTestSet(selectedCatId, selectedLevel);
    startQuiz(mockSet);
  };

  return (
    <div 
      className={`glass-card rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden relative ${className}`}
    >
      {/* Decorative ambient subtle gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{language === 'ne' ? 'अन्तरक्रियात्मक तह छनोट' : 'Interactive Level Hub'}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {language === 'ne' ? 'नयाँ पाठ्यक्रम २०८२/८३' : 'New Syllabus 2026'}
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'ne' ? 'तहगत पाठ्यक्रम, प्रश्न भण्डार र अनलाइन परीक्षा' : 'Level-wise Syllabus, Question Bank & Mock Test'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ne' 
              ? 'आफ्नो तयारीको क्षेत्र र तह छान्नुहोस् र ४-ट्याब विस्तृत गाइड हेर्नुहोस्' 
              : 'Select your target sector and tier to explore syllabus, MCQs and test engine'}
          </p>
        </div>

        {/* Level Selector Tabs ("तह ४", "तह ५", "तह ६") */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto shadow-2xs">
          {LEVEL_DEFINITIONS.map(def => {
            const isSelected = def.level === selectedLevel;
            return (
              <button
                key={def.level}
                type="button"
                onClick={() => setSelectedLevel(def.level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{language === 'ne' ? def.shortLabelNe : def.shortLabelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Category Selector Bar */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto custom-scrollbar pb-1 relative z-10">
        {PRIMARY_CATEGORIES.map(cat => {
          const isActive = cat.id === selectedCatId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0B2046] text-white shadow-sm'
                  : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat.id === 'banking' && <Landmark className="w-3.5 h-3.5" />}
              {cat.id === 'enterprises' && <Building2 className="w-3.5 h-3.5" />}
              {cat.id === 'loksewa' && <Scale className="w-3.5 h-3.5" />}
              <span>{language === 'ne' ? cat.nameNe : cat.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Level Details Box */}
      <div className="mt-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-800 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {language === 'ne' ? `${currentCategory.nameNe} • ${levelMeta.labelNe}` : `${currentCategory.nameEn} • ${levelMeta.labelEn}`}
              </h4>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                {levelData.papers.length} {language === 'ne' ? 'पत्रहरू (Paper I & II)' : 'Papers (Paper I & II)'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                {levelData.totalTopics} {language === 'ne' ? 'पाठ्यक्रम शीर्षकहरू' : 'Topics'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {levelMeta.totalMarks} {language === 'ne' ? 'पूर्णाङ्क' : 'Total Marks'}
              </span>
              <span>•</span>
              <span className="text-[11px] text-slate-500">
                {language === 'ne' ? `योग्यता: ${levelMeta.minEduNe}` : `Edu: ${levelMeta.minEduEn}`}
              </span>
            </div>
          </div>

          {/* Progress overview */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {language === 'ne' ? 'अध्ययन प्रगति' : 'Syllabus Progress'}
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {progressPercentage}%
              </div>
            </div>
            <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4-Tab Quick Links & Launchers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => openLevelDashboard(selectedCatId, selectedLevel, 0)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Tab 1</div>
              <div className="text-xs font-bold group-hover:text-blue-600 transition">
                {language === 'ne' ? 'पाठ्यक्रम विश्लेषण' : 'Syllabus'}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            type="button"
            onClick={() => openLevelDashboard(selectedCatId, selectedLevel, 1)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Tab 2</div>
              <div className="text-xs font-bold group-hover:text-indigo-600 transition">
                {language === 'ne' ? 'प्रश्न भण्डार MCQs' : 'Question Bank'}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            type="button"
            onClick={() => openLevelDashboard(selectedCatId, selectedLevel, 2)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Tab 3</div>
              <div className="text-xs font-bold group-hover:text-amber-600 transition">
                {language === 'ne' ? 'अनलाइन परीक्षा' : 'Mock Test'}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            type="button"
            onClick={() => openLevelDashboard(selectedCatId, selectedLevel, 3)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Tab 4</div>
              <div className="text-xs font-bold group-hover:text-emerald-600 transition">
                {language === 'ne' ? 'प्रगति ट्र्याकर' : 'Progress'}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* Action CTA Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 relative z-10">
        <button
          type="button"
          onClick={() => openLevelDashboard(selectedCatId, selectedLevel, 0)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <span>{language === 'ne' ? 'पूरा पाठ्यक्रम तथा प्रश्न भण्डार खोल्नुहोस्' : 'Expand 4-Tab Interactive Dashboard'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleLaunchMock}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md active:scale-95"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{language === 'ne' ? 'यस तहको ५० प्रश्न अनलाइन परीक्षा दिनुहोस्' : 'Start 50-Question Mock Test'}</span>
        </button>
      </div>
    </div>
  );
};
