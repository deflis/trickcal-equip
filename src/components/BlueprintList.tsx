import { Filter, Trash2, Minus, Plus, Zap, Swords, Sparkles, Layers, Check, ChevronsUp, type LucideIcon } from 'lucide-react';
import type { AttackType, RankId, BlueprintWithState } from '../data/types';
import { useStore } from '../store';
import { selectMainItems, selectSubItems } from '../selectors';
import { getBlueprintIcon } from '../data/blueprints';

const RANKS: ('All' | RankId)[] = ['All', 8, 7, 6, 5, 4, 3, 2];

const ATTACK_TYPES: { label: string; value: AttackType | 'all'; icon: LucideIcon }[] = [
  { label: 'すべて', value: 'all', icon: Layers },
  { label: '物理', value: 'physical', icon: Swords },
  { label: '魔法', value: 'magic', icon: Sparkles },
];

const BlueprintCard = ({ bp }: { bp: BlueprintWithState }) => {
  const { req, held, shortage, isComplete } = bp;

  const onUpdate = useStore(s => s.updateReq);
  const onSetValue = useStore(s => s.setReqValue);
  const onClearItem = useStore(s => s.clearItem);
  const onUpdateHolding = useStore(s => s.updateHolding);
  const onSetHoldingValue = useStore(s => s.setHoldingValue);
  const onClearHolding = useStore(s => s.clearHolding);
  const onConsumeHolding = useStore(s => s.consumeHolding);

  const showActions = req > 0 || held > 0;

  return (
    <div
      className={`flex flex-col p-3 rounded-xl border transition-all duration-200 hover:shadow-card-hover hover:-translate-y-[2px] ${
        shortage > 0
          ? 'border-primary/30 bg-primary/5'
          : isComplete
          ? 'border-status-success/30 bg-status-success/5'
          : held > 0
          ? 'border-border-subtle bg-surface-bg'
          : 'border-transparent bg-surface-bg'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 bg-surface rounded-lg border border-border-subtle flex items-center justify-center p-0.5 shadow-sm">
            <img src={getBlueprintIcon(bp)} alt={bp.name} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-small ${shortage > 0 ? 'text-primary' : isComplete ? 'text-status-success' : 'text-text-primary'}`}>
              {bp.name}
            </div>
            <div className="text-caption text-text-secondary mt-0.5">Rank {bp.rank}</div>
          </div>
        </div>

        {req > 0 && (
          <div className="shrink-0">
            {isComplete ? (
               <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-status-success/10 border border-status-success/20 text-status-success text-caption font-bold">
                <Check className="w-3 h-3" />
                完了
              </span>
            ) : (
              <span className="flex items-baseline gap-1 px-2 py-0.5 rounded-full bg-status-warning/10 border border-status-warning/20 text-status-warning text-caption font-bold">
                不足
                <span className="text-small font-black">{shortage}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-caption font-bold text-primary px-0.5">必要</span>
          <div className="flex items-center bg-surface rounded-md shadow-sm border border-primary/20 overflow-hidden w-full transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/12">
            <button onClick={() => onUpdate(bp.id, -1)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={req === 0 ? '' : req}
              placeholder="0"
              onChange={(e) => onSetValue(bp.id, e.target.value)}
              className="flex-1 w-full min-w-0 text-center font-bold text-body text-primary focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => onUpdate(bp.id, 1)} className="p-1.5 text-primary hover:text-primary-hover hover:bg-primary/5 transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-caption font-bold text-text-secondary px-0.5">所持</span>
          <div className="flex items-center bg-surface rounded-md shadow-sm border border-border-subtle overflow-hidden w-full transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/12">
            <button onClick={() => onUpdateHolding(bp.id, -1)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={held === 0 ? '' : held}
              placeholder="0"
              onChange={(e) => onSetHoldingValue(bp.id, e.target.value)}
              className="flex-1 w-full min-w-0 text-center font-bold text-body text-text-secondary focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => onUpdateHolding(bp.id, 1)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border-subtle">
          {req > 0 && held < req && (
            <button
              onClick={() => onSetHoldingValue(bp.id, String(req))}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-caption font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded transition-colors"
              title="所持数を必要数まで一気に増やす"
            >
              <ChevronsUp className="w-2.5 h-2.5" />
              MAX
            </button>
          )}
          {held > 0 && req > 0 && (
            <button
              onClick={() => onConsumeHolding(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-caption font-bold text-status-warning bg-status-warning/10 hover:bg-status-warning/20 border border-status-warning/20 rounded transition-colors"
              title="所持数を必要数に充当して消費"
            >
              <Zap className="w-2.5 h-2.5" />
              消費
            </button>
          )}
          {req > 0 && (
            <button
              onClick={() => onClearItem(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-caption font-medium text-primary/70 hover:text-primary hover:bg-primary/10 rounded transition-colors"
              title="必要数をリセット"
            >
              <Trash2 className="w-3 h-3" />
              必要
            </button>
          )}
          {held > 0 && (
            <button
              onClick={() => onClearHolding(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-caption font-medium text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
              title="所持数をリセット"
            >
              <Trash2 className="w-3 h-3" />
              所持
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const BlueprintList = () => {
  const selectedRank = useStore(s => s.selectedRank);
  const selectedAttackType = useStore(s => s.selectedAttackType);
  const setSelectedRank = useStore(s => s.setSelectedRank);
  const setSelectedAttackType = useStore(s => s.setSelectedAttackType);
  const applyRankConfig = useStore(s => s.applyRankConfig);

  const mainItems = useStore(selectMainItems);
  const subItems = useStore(selectSubItems);

  const onRankChange = (newRank: 'All' | RankId) => {
    setSelectedRank(newRank);
    if (newRank !== 'All') {
      applyRankConfig(newRank, selectedAttackType);
    }
  };

  const onAttackTypeChange = (type: AttackType | 'all') => {
    setSelectedAttackType(type);
    if (selectedRank !== 'All') {
      applyRankConfig(selectedRank, type);
    }
  };

  const subRank = selectedRank !== 'All' ? selectedRank - 1 : null;
  const hasSubItems = subItems.length > 0;

  return (
    <div className="bg-surface rounded-xl border border-border-subtle p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-subhead font-display font-semibold flex items-center gap-2 text-text-primary tracking-tight">
          <Filter className="text-primary w-5 h-5" />
          設計図リスト
        </h2>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {RANKS.map(rank => (
            <button
              key={rank}
              onClick={() => onRankChange(rank)}
              className={`px-3 py-1.5 rounded-md text-small font-bold transition-all shrink-0 ${
                selectedRank === rank
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-bg text-text-secondary border border-border-subtle hover:bg-surface shadow-sm'
              }`}
            >
              {rank === 'All' ? 'すべて' : `Rank${rank}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {ATTACK_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => onAttackTypeChange(type.value)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-small font-bold transition-all ${
                selectedAttackType === type.value
                  ? 'bg-status-warning/10 text-status-warning border-2 border-status-warning shadow-sm'
                  : 'bg-surface text-text-secondary border-2 border-border-subtle hover:bg-surface-bg'
              }`}
            >
              <type.icon className="w-3.5 h-3.5" />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mainItems.map((bp: BlueprintWithState) => (
            <BlueprintCard key={bp.id} bp={bp} />
          ))}
        </div>

        {hasSubItems && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-small font-bold text-text-secondary bg-surface-bg border border-border-subtle px-2 py-0.5 rounded-full">
                Rank {subRank}（下位ランク）
              </span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subItems.map((bp: BlueprintWithState) => (
                <BlueprintCard key={bp.id} bp={bp} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
