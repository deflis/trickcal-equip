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
  const totalJoseki = useStore(selectTotalJoseki);
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended');

  return (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full min-h-100">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
        <MapPin className="text-emerald-500 w-5 h-5" />
        推奨周回ステージ
      </h2>
      <div className="flex items-center gap-3">
        {activeTab === 'all' && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              {showDuplicates ? '重複あり' : '重複なし'}
            </span>
            <div 
              onClick={() => setShowDuplicates(!showDuplicates)}
              className={`relative w-8 h-4 rounded-full transition-colors ${showDuplicates ? 'bg-indigo-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showDuplicates ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </label>
        )}
        <div className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-bold">
          UP TO {maxWorld}-{maxStageNum}
        </div>
      </div>
    </div>

    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
      <button
        onClick={() => setActiveTab('recommended')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
          activeTab === 'recommended'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Zap className={`w-3.5 h-3.5 ${activeTab === 'recommended' ? 'fill-emerald-500' : ''}`} />
        効率ルート
      </button>
      <button
        onClick={() => setActiveTab('all')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
          activeTab === 'all'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
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
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">定石代用</p>
            <p className="text-xs text-amber-600/80 font-medium">不足分をすべて定石で賄う場合</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-amber-600">{totalJoseki.toLocaleString()}</span>
          <span className="text-xs font-bold text-amber-500 ml-1">個</span>
        </div>
      </div>
    )}
  </div>
  );
};
