import { Trophy, Trash2, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { BLUEPRINTS, RANK_CONFIG } from '../data/blueprints';
import type { AttackType, Blueprint, BlueprintId } from '../data/types';
import { useStore } from '../store';
import { parseSafeInt } from '../utils/number';

const StageProgressInput = () => {
  const maxWorld = useStore(s => s.maxWorld);
  const maxStageNum = useStore(s => s.maxStageNum);
  const setMaxWorld = useStore(s => s.setMaxWorld);
  const setMaxStageNum = useStore(s => s.setMaxStageNum);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-bg p-4 rounded-lg border border-border-subtle shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-status-warning/10 p-1.5 rounded-md text-status-warning shadow-sm">
          <Trophy className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-text-primary">最高到達ステージ</h3>
          <p className="text-[10px] text-text-secondary mt-0.5">これ以降のドロップは無視されます</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-md border border-border-subtle focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/12 transition-all">
          <span className="text-[10px] font-bold text-text-secondary">WORLD</span>
          <input
            type="number"
            value={maxWorld}
            onChange={(e) => {
              setMaxWorld(Math.max(1, parseSafeInt(e.target.value)));
            }}
            className="bg-transparent w-10 text-center font-black text-primary outline-none"
          />
        </div>
        <span className="text-border-subtle font-bold">—</span>
        <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-md border border-border-subtle focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/12 transition-all">
          <span className="text-[10px] font-bold text-text-secondary">STAGE</span>
          <input
            type="number"
            value={maxStageNum}
            onChange={(e) => {
              setMaxStageNum(Math.max(1, parseSafeInt(e.target.value)));
            }}
            className="bg-transparent w-8 text-center font-black text-primary outline-none"
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
  const config = selectedRank !== 'All' ? RANK_CONFIG[selectedRank] : null;
  const hasSub = config ? config.sub > 0 : false;
  const isTypeSelected = selectedAttackType !== 'all';

  const targetBlueprints = isTypeSelected && selectedRank !== 'All'
    ? BLUEPRINTS.filter(b =>
        b.rank === selectedRank &&
        (b.attackType === selectedAttackType || b.attackType === 'both')
      )
    : [];

  const handleAttackTypeSelect = (type: AttackType) => {
    setSelectedAttackType(type);
    if (selectedRank !== 'All') {
      applyRankConfig(selectedRank, type);
    }
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
        <h3 className="text-sm font-display font-bold uppercase tracking-widest flex items-center gap-2 text-text-primary">
          <CheckCircle2 className="w-4 h-4 text-status-success" />
          収集モード（1人分）
        </h3>
        {hasRequirements && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-status-error hover:bg-red-600 text-white rounded-md text-xs font-bold transition-all shadow-sm hover:shadow-card-hover hover:-translate-y-[1px]"
          >
            <Trash2 className="w-3.5 h-3.5" /> 全リセット
          </button>
        )}
      </div>

      {selectedRank !== 'All' && config ? (
        <div className="space-y-3">
          <div className="bg-surface-bg rounded-lg p-3 border border-border-subtle space-y-2">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">装備を選択</p>

            <div className="flex flex-wrap gap-2">
              {isTypeSelected && (
                <button
                  onClick={() => setSelectedAttackType('all')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border bg-surface border-border-subtle text-text-secondary hover:bg-surface-bg"
                >
                  すべて
                </button>
              )}
              <button
                onClick={() => handleAttackTypeSelect('physical')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  selectedAttackType === 'physical'
                    ? 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                    : 'bg-surface border-border-subtle text-text-secondary hover:bg-surface-bg'
                }`}
              >
                物理装備
              </button>
              <button
                onClick={() => handleAttackTypeSelect('magic')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                  selectedAttackType === 'magic'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-surface border-border-subtle text-text-secondary hover:bg-surface-bg'
                }`}
              >
                魔法装備
              </button>
            </div>

            {isTypeSelected && targetBlueprints.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-border-subtle">
                {targetBlueprints.map(bp => {
                  const isOn = items.some(i => i.id === bp.id && i.req > 0);
                  return (
                    <button
                      key={bp.id}
                      onClick={() => handleItemToggle(bp, isOn)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        isOn
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'bg-surface border-border-subtle text-text-secondary/50 line-through hover:bg-surface-bg hover:text-text-secondary'
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
            <div className="flex items-center gap-4 text-[10px] font-bold text-text-secondary">
              <span>R{selectedRank}: {config.main}枚</span>
              {hasSub && (
                <span>R{selectedRank - 1}: {config.sub}枚</span>
              )}
            </div>
            <button
              onClick={() => hasSub ? onClearRankWithSub(selectedRank) : onClearRank(selectedRank)}
              className="text-[10px] flex items-center gap-1 text-primary/70 hover:text-primary transition-colors font-bold"
            >
              <RefreshCcw className="w-3 h-3" />
              {hasSub
                ? `Rank ${selectedRank} + ${selectedRank - 1} をクリア`
                : `Rank ${selectedRank} をクリア`}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center border border-border-subtle rounded-lg bg-surface-bg">
          <p className="text-xs text-text-secondary">設計図リストからランクを選択してください</p>
        </div>
      )}
    </div>
  );
};

export const QuickActionPanel = () => {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border-subtle p-6 text-text-primary">
      <div className="relative z-10 space-y-5">
        <StageProgressInput />
        <CollectionModeSection />
      </div>
    </div>
  );
};
