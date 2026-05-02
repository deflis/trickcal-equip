import { MapPin, Zap, List, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';
import { StageList } from './StageList';
import { selectTotalJoseki } from '../selectors';

export const AnalysisPanel = () => {
  const maxWorld = useStore(state => state.maxWorld);
  const maxStageNum = useStore(state => state.maxStageNum);
  const showDuplicates = useStore(state => state.showDuplicates);
  const setShowDuplicates = useStore(state => state.setShowDuplicates);
  const routeSortOrder = useStore(state => state.routeSortOrder);
  const setRouteSortOrder = useStore(state => state.setRouteSortOrder);
  const totalJoseki = useStore(selectTotalJoseki);
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended');

  return (
  <div className="bg-surface rounded-xl border border-border-subtle p-6 h-full min-h-100">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-subhead font-display font-semibold flex items-center gap-2 text-text-primary tracking-tight">
        <MapPin className="text-status-success w-5 h-5" />
        推奨周回ステージ
      </h2>
      <div className="flex items-center gap-3">
        {activeTab === 'recommended' && (
          <label className="flex items-center gap-2 cursor-pointer group mr-2">
            <span className="text-caption font-bold text-text-secondary group-hover:text-status-success transition-colors">
              {routeSortOrder === 'efficiency' ? '消費数順' : 'ランク順'}
            </span>
            <div
              onClick={() => setRouteSortOrder(routeSortOrder === 'efficiency' ? 'rank' : 'efficiency')}
              className={`relative w-8 h-4 rounded-full transition-colors ${routeSortOrder === 'rank' ? 'bg-status-success' : 'bg-border-subtle'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-surface rounded-full transition-transform ${routeSortOrder === 'rank' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </label>
        )}
        {activeTab === 'all' && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-caption font-bold text-text-secondary group-hover:text-primary transition-colors">
              {showDuplicates ? '重複あり' : '重複なし'}
            </span>
            <div 
              onClick={() => setShowDuplicates(!showDuplicates)}
              className={`relative w-8 h-4 rounded-full transition-colors ${showDuplicates ? 'bg-primary' : 'bg-border-subtle'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-surface rounded-full transition-transform ${showDuplicates ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </label>
        )}
        <div className="text-overline uppercase bg-surface-bg border border-border-subtle px-2 py-1 rounded-md text-text-secondary font-bold">
          UP TO {maxWorld}-{maxStageNum}
        </div>
      </div>
    </div>

    <div className="flex bg-surface-bg border border-border-subtle p-1 rounded-lg mb-6">
      <button
        onClick={() => setActiveTab('recommended')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 text-small font-bold rounded-md transition-all ${
          activeTab === 'recommended'
            ? 'bg-surface text-status-success shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <Zap className={`w-3.5 h-3.5 ${activeTab === 'recommended' ? 'fill-status-success' : ''}`} />
        効率ルート
      </button>
      <button
        onClick={() => setActiveTab('all')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 text-small font-bold rounded-md transition-all ${
          activeTab === 'all'
            ? 'bg-surface text-primary shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <List className="w-3.5 h-3.5" />
        全ステージ
      </button>
    </div>

    <StageList activeTab={activeTab} />

    {totalJoseki > 0 && (
      <div className="mt-6 p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-overline font-bold text-amber-700 uppercase tracking-wider">定石代用</p>
            <p className="text-small text-amber-600/80 font-medium">不足分をすべて定石で賄う場合</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-section font-black text-amber-600">{totalJoseki.toLocaleString()}</span>
          <span className="text-small font-bold text-amber-500 ml-1">個</span>
        </div>
      </div>
    )}
  </div>
  );
};
