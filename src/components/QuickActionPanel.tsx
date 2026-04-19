import { Trophy, Sparkles, Trash2, RefreshCcw, Swords, Sparkle, CheckCircle2 } from 'lucide-react';
import { RANK_CONFIG } from '../blueprints';
import type { AttackType, RankKey } from '../types';
import { useStore } from '../store';

const StageProgressInput = () => {
  const maxWorld = useStore(s => s.maxWorld);
  const maxStageNum = useStore(s => s.maxStageNum);
  const setMaxWorld = useStore(s => s.setMaxWorld);
  const setMaxStageNum = useStore(s => s.setMaxStageNum);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/10 p-4 rounded-xl border border-white/20 shadow-inner">
      <div className="flex items-center gap-2">
        <div className="bg-amber-400 p-1.5 rounded-lg text-indigo-900 shadow-sm">
          <Trophy className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-90">最高到達ステージ</h3>
          <p className="text-[10px] opacity-60">これ以降のドロップは無視されます</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-bold opacity-60">WORLD</span>
          <input
            type="number"
            value={maxWorld}
            onChange={(e) => setMaxWorld(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-transparent w-10 text-center font-black text-amber-400 outline-none"
          />
        </div>
        <span className="text-white opacity-40">—</span>
        <div className="flex items-center gap-1.5 bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-bold opacity-60">STAGE</span>
          <input
            type="number"
            value={maxStageNum}
            onChange={(e) => setMaxStageNum(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-transparent w-8 text-center font-black text-amber-400 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

const CollectionModeSection = () => {
  const selectedRank = useStore(s => s.selectedRank);
  const selectedAttackType = useStore(s => s.selectedAttackType);
  const setSelectedAttackType = useStore(s => s.setSelectedAttackType);
  const items = useStore(s => s.items);
  const onClearAll = useStore(s => s.clearAll);
  const onClearRank = useStore(s => s.clearRank);
  const applyRankConfig = useStore(s => s.applyRankConfig);

  const hasRequirements = items.length > 0;
  const physActive = selectedAttackType === 'physical';
  const magicActive = selectedAttackType === 'magic';

  const onAttackTypeChange = (type: AttackType | 'all') => {
    setSelectedAttackType(type);
    applyRankConfig(selectedRank, type);
  };

  const handleToggle = (type: AttackType) => {
    if (selectedAttackType === type) {
      onAttackTypeChange('all');
    } else {
      onAttackTypeChange(type);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 opacity-90">
          <CheckCircle2 className="w-4 h-4" />
          収集モード（1人分）
        </h3>
        {hasRequirements && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" /> 全リセット
          </button>
        )}
      </div>

      {selectedRank !== 'All' && RANK_CONFIG[selectedRank as RankKey] ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleToggle('physical')}
              className={`relative py-4 rounded-xl flex flex-col items-center transition-all active:scale-95 shadow-md border-2 ${
                physActive 
                  ? 'bg-amber-400 text-indigo-950 border-amber-300' 
                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
              }`}
            >
              <Swords className={`w-5 h-5 mb-1 ${physActive ? 'text-indigo-900' : 'text-indigo-300'}`} />
              <span className="font-bold text-sm">物理キャラ</span>
              {physActive && <div className="absolute top-1 right-1 bg-indigo-900 text-white rounded-full p-0.5"><CheckCircle2 className="w-3 h-3" /></div>}
            </button>
            
            <button
              onClick={() => handleToggle('magic')}
              className={`relative py-4 rounded-xl flex flex-col items-center transition-all active:scale-95 shadow-md border-2 ${
                magicActive 
                  ? 'bg-purple-400 text-indigo-950 border-purple-300' 
                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
              }`}
            >
              <Sparkle className={`w-5 h-5 mb-1 ${magicActive ? 'text-indigo-900' : 'text-indigo-300'}`} />
              <span className="font-bold text-sm">魔法キャラ</span>
              {magicActive && <div className="absolute top-1 right-1 bg-indigo-900 text-white rounded-full p-0.5"><CheckCircle2 className="w-3 h-3" /></div>}
            </button>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-4 text-[10px] opacity-70 font-bold text-amber-200">
              <span>R{selectedRank}: {RANK_CONFIG[selectedRank as RankKey].main}枚</span>
              {RANK_CONFIG[selectedRank as RankKey].sub > 0 && (
                <span>R{parseInt(selectedRank) - 1}: {RANK_CONFIG[selectedRank as RankKey].sub}枚</span>
              )}
            </div>
            <button
              onClick={() => onClearRank(selectedRank)}
              className="text-[10px] flex items-center gap-1 text-indigo-200 hover:text-white transition-colors font-bold"
            >
              <RefreshCcw className="w-3 h-3" /> Rank {selectedRank} をクリア
            </button>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center border border-white/10 rounded-xl bg-white/5">
          <p className="text-xs opacity-60">設計図リストからランクを選択してください</p>
        </div>
      )}
    </div>
  );
};

export const QuickActionPanel = () => {
  return (
    <div className="bg-linear-to-br from-indigo-700 to-indigo-900 rounded-2xl shadow-lg border border-indigo-500 p-5 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-20 h-20" />
      </div>
      
      <div className="relative z-10 space-y-5">
        <StageProgressInput />
        <CollectionModeSection />
      </div>
    </div>
  );
};
