import { Filter, Trash2, Minus, Plus, Zap, Swords, Sparkles, Layers, Check, type LucideIcon } from 'lucide-react';
import type { AttackType, RankKey, BlueprintWithState } from '../data/types';
import { useStore } from '../store';
import { selectMainItems, selectSubItems } from '../selectors';
import { getBlueprintIcon } from '../data/blueprints';
import { parseSafeInt } from '../utils/number';

const RANKS = ['All', '8', '7', '6', '5', '4', '3', '2'] as const satisfies ("All" | RankKey)[];

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
      className={`flex flex-col p-3 rounded-xl border transition-all ${
        shortage > 0
          ? 'border-indigo-300 bg-indigo-50/30'
          : isComplete
          ? 'border-green-300 bg-green-50/30'
          : held > 0
          ? 'border-slate-300 bg-slate-50'
          : 'border-slate-100 bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center p-0.5 shadow-sm">
            <img src={getBlueprintIcon(bp)} alt={bp.name} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-xs truncate ${shortage > 0 ? 'text-indigo-900' : isComplete ? 'text-green-800' : 'text-slate-700'}`}>
              {bp.name}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Rank {bp.rank}</div>
          </div>
        </div>

        {req > 0 && (
          <div className="shrink-0">
            {isComplete ? (
              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-700 text-[10px] font-bold">
                <Check className="w-3 h-3" />
                完了
              </span>
            ) : (
              <span className="flex items-baseline gap-1 px-2 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-bold">
                不足
                <span className="text-xs font-black">{shortage}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-bold text-indigo-500 px-0.5">必要</span>
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-indigo-100 overflow-hidden w-full">
            <button onClick={() => onUpdate(bp.id, -1)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={req === 0 ? '' : req}
              placeholder="0"
              onChange={(e) => onSetValue(bp.id, e.target.value)}
              className="flex-1 w-full min-w-0 text-center font-bold text-sm text-indigo-600 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => onUpdate(bp.id, 1)} className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-slate-50 transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-500 px-0.5">所持</span>
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
            <button onClick={() => onUpdateHolding(bp.id, -1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={held === 0 ? '' : held}
              placeholder="0"
              onChange={(e) => onSetHoldingValue(bp.id, e.target.value)}
              className="flex-1 w-full min-w-0 text-center font-bold text-sm text-slate-600 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => onUpdateHolding(bp.id, 1)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-100">
          {held > 0 && req > 0 && (
            <button
              onClick={() => onConsumeHolding(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
              title="所持数を必要数に充当して消費"
            >
              <Zap className="w-2.5 h-2.5" />
              消費
            </button>
          )}
          {req > 0 && (
            <button
              onClick={() => onClearItem(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="必要数をリセット"
            >
              <Trash2 className="w-3 h-3" />
              必要
            </button>
          )}
          {held > 0 && (
            <button
              onClick={() => onClearHolding(bp.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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

  const onRankChange = (newRank: string) => {
    setSelectedRank(newRank);
    applyRankConfig(newRank, selectedAttackType);
  };

  const onAttackTypeChange = (type: AttackType | 'all') => {
    setSelectedAttackType(type);
    applyRankConfig(selectedRank, type);
  };

  const subRank = selectedRank !== 'All' ? parseSafeInt(selectedRank) - 1 : null;
  const hasSubItems = subItems.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
          <Filter className="text-indigo-500 w-5 h-5" />
          設計図リスト
        </h2>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {RANKS.map(rank => (
            <button
              key={rank}
              onClick={() => onRankChange(rank)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
                selectedRank === rank
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 shadow-sm'
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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedAttackType === type.value
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 shadow-sm'
                  : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-slate-200'
              }`}
            >
              <type.icon className="w-3.5 h-3.5" />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mainItems.map(bp => (
            <BlueprintCard key={bp.id} bp={bp} />
          ))}
        </div>

        {hasSubItems && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Rank {subRank}（下位ランク）
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subItems.map(bp => (
                <BlueprintCard key={bp.id} bp={bp} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
