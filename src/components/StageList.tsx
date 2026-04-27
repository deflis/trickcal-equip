import { Info } from 'lucide-react';
import { useStore } from '../store';
import { selectRecommendedRoutes, selectAllStages, selectRecommendedStage } from '../selectors';
import type { StageResult } from '../data/types';
import { getBlueprintIcon } from '../data/blueprints';
import { STAGE_MAP, BLUEPRINT_MAP, getStageSortValue } from '../logic/stageRecommendation';
import type { BlueprintId, MatchingItem } from '../data/types';

interface StageListProps {
  activeTab: 'recommended' | 'all';
}

const RequiredItemChip = ({
  item,
  isPriority,
  activeTab
}: {
  item: MatchingItem,
  isPriority: boolean,
  activeTab: 'recommended' | 'all' 
}) => {
  const blueprint = BLUEPRINT_MAP.get(item.id);
  if (!blueprint) return null;

  return (
    <span
      className={`flex items-center gap-1.5 text-[10px] border px-2 py-1 rounded-md shadow-sm font-bold transition-colors ${
        isPriority
          ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-500/20'
          : 'bg-white border-slate-100 text-slate-600'
      }`}
    >
      <img src={getBlueprintIcon(blueprint)} alt={blueprint.name} className="w-4 h-4 object-contain" />
      <span className="truncate max-w-20">{blueprint.name}</span>
      <span className={isPriority ? 'text-amber-600' : activeTab === 'recommended' ? 'text-emerald-600' : 'text-indigo-600'}>x{item.needed}</span>
      {isPriority && <span className="ml-0.5 text-[8px] opacity-70">★</span>}
    </span>
  );
};

const RequiredDrops = ({ result, activeTab }: { result: StageResult, activeTab: 'recommended' | 'all' }) => {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-2">
        <Info className="w-3 h-3" />
        ドロップする必要アイテム
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {result.matchingItems.map(item => (
          <RequiredItemChip
            key={item.id}
            item={item}
            isPriority={activeTab === 'recommended' && result.priorityItemId === item.id}
            activeTab={activeTab}
          />
        ))}
      </div>
    </div>
  );
};

const OtherDropChip = ({ id }: { id: BlueprintId }) => {
  const blueprint = BLUEPRINT_MAP.get(id);
  if (!blueprint) return null;

  return (
    <span className="flex items-center gap-1 text-[9px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400">
      <img src={getBlueprintIcon(blueprint)} alt={blueprint.name} className="w-3 h-3 object-contain grayscale opacity-70" />
      {blueprint.name}
    </span>
  );
};

const OtherDrops = ({ result }: { result: StageResult }) => {
  const stageData = STAGE_MAP.get(result.id);
  if (!stageData) return null;
  
  const matchingIds = new Set(result.matchingItems.map(m => m.id));
  const otherDropIds = stageData.drops.filter(id => !matchingIds.has(id));
  
  if (otherDropIds.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-50">
      <div className="text-[9px] font-bold text-slate-300 mb-1.5">
        副産物
      </div>
      <div className="flex flex-wrap gap-1 opacity-70">
        {otherDropIds.map(id => (
          <OtherDropChip key={id} id={id} />
        ))}
      </div>
    </div>
  );
};

export const StageList = ({ activeTab }: StageListProps) => {
  const selectedRouteIndex = useStore(state => state.selectedRouteIndex);
  const setSelectedRouteIndex = useStore(state => state.setSelectedRouteIndex);
  const recommendedRoutes = useStore(selectRecommendedRoutes);
  const recommendedStage = useStore(selectRecommendedStage);
  const allStages = useStore(selectAllStages);

  const displayStages = activeTab === 'all' ? allStages : recommendedStage;

  if (displayStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-300 text-center">
        <div className="bg-slate-50 p-6 rounded-full mb-4">
          <Info className="w-12 h-12 opacity-20" />
        </div>
        <p className="text-sm font-medium">到達範囲内にドロップステージが<br />見つかりません</p>
      </div>
    );
  }

  return (
    <>
      {activeTab === 'recommended' && (
        <div className="space-y-4 mb-6">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-700 font-medium">
            すべての必要アイテムを網羅する、効率的なステージの組み合わせです。
          </div>

          {recommendedRoutes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {recommendedRoutes.map((rSet, i) => {
                const totalLevel = rSet.reduce((sum, s) => sum + getStageSortValue(s), 0);
                const avgLevel = Math.floor(totalLevel / rSet.length);
                const isSelected = selectedRouteIndex === i;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedRouteIndex(i)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                        : 'bg-white border-emerald-100 text-emerald-700 hover:border-emerald-200'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-80 mb-0.5">
                      Candidate {i + 1}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>{rSet.length} Stages</span>
                      <span className="opacity-50 text-[10px]">|</span>
                      <span>Avg. Lvl {avgLevel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="space-y-4">
        {displayStages.map((result: StageResult, index) => {
          const isTopLevel = activeTab === 'all' && index === 0;
          
          return (
            <div
              key={result.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                activeTab === 'recommended'
                  ? 'border-emerald-100 bg-white hover:border-emerald-200'
                  : isTopLevel
                  ? 'border-indigo-200 bg-indigo-50 shadow-md'
                  : 'border-slate-100 bg-white hover:border-indigo-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-1 flex-wrap mb-1">
                    {activeTab === 'recommended' && (
                      <span className="inline-block px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                        STEP {index + 1}
                      </span>
                    )}
                    {isTopLevel && (
                      <span className="inline-block px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                        MOST EFFICIENT
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    World {result.id}
                  </h3>
                </div>
              </div>

              <RequiredDrops result={result} activeTab={activeTab} />
              <OtherDrops result={result} />
            </div>
          );
        })}
      </div>
    </>
  );
};
