import { Trophy, Sparkles, Trash2, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { BLUEPRINTS, RANK_CONFIG } from '../blueprints';
import type { AttackType, Blueprint, BlueprintId, RankKey } from '../types';
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
  const onClearRankWithSub = useStore(s => s.clearRankWithSub);
  const applyRankConfig = useStore(s => s.applyRankConfig);
  const setReqValue = useStore(s => s.setReqValue);
  const clearItem = useStore(s => s.clearItem);

  const hasRequirements = items.length > 0;
  const config = selectedRank !== 'All' ? RANK_CONFIG[selectedRank as RankKey] : null;
  const hasSub = config ? config.sub > 0 : false;
  const isTypeSelected = selectedAttackType !== 'all';

  const targetBlueprints = isTypeSelected && selectedRank !== 'All'
    ? BLUEPRINTS.filter(b =>
        b.rank === parseInt(selectedRank) &&
        (b.attackType === selectedAttackType || b.attackType === 'both')
      )
    : [];

  const handleAttackTypeSelect = (type: AttackType) => {
    setSelectedAttackType(type);
    applyRankConfig(selectedRank, type);
  };

  const handleItemToggle = (bp: Blueprint, currentlyOn: boolean) => {
    const subId = hasSub
      ? `${bp.rank - 1}${bp.typeId}` as BlueprintId
      : null;
    if (currentlyOn) {
      clearItem(bp.id);
      if (subId) clearItem(subId);
    } else {
      setReqValue(bp.id, String(config!.main));
      if (subId) setReqValue(subId, String(config!.sub));
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

      {selectedRank !== 'All' && config ? (
        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">装備を選択</p>

            <div className="flex flex-wrap gap-2">
              {isTypeSelected && (
                <button
                  onClick={() => setSelectedAttackType('all')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                >
                  すべて
                </button>
              )}
              <button
                onClick={() => handleAttackTypeSelect('physical')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                  selectedAttackType === 'physical'
                    ? 'bg-amber-400/30 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                物理装備
              </button>
              <button
                onClick={() => handleAttackTypeSelect('magic')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                  selectedAttackType === 'magic'
                    ? 'bg-purple-400/30 border-purple-400/50 text-purple-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                魔法装備
              </button>
            </div>

            {isTypeSelected && targetBlueprints.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
                {targetBlueprints.map(bp => {
                  const isOn = items.some(i => i.id === bp.id && i.req > 0);
                  return (
                    <button
                      key={bp.id}
                      onClick={() => handleItemToggle(bp, isOn)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        isOn
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-white/40 line-through'
                      }`}
                    >
                      {bp.type}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-4 text-[10px] opacity-70 font-bold text-amber-200">
              <span>R{selectedRank}: {config.main}枚</span>
              {hasSub && (
                <span>R{parseInt(selectedRank) - 1}: {config.sub}枚</span>
              )}
            </div>
            <button
              onClick={() => hasSub ? onClearRankWithSub(selectedRank) : onClearRank(selectedRank)}
              className="text-[10px] flex items-center gap-1 text-indigo-200 hover:text-white transition-colors font-bold"
            >
              <RefreshCcw className="w-3 h-3" />
              {hasSub
                ? `Rank ${selectedRank} + ${parseInt(selectedRank) - 1} をクリア`
                : `Rank ${selectedRank} をクリア`}
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
