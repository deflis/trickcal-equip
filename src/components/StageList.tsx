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
      className={`flex items-center gap-1.5 text-caption border px-3 py-1 rounded-full shadow-sm font-bold transition-colors ${
        isPriority
          ? 'bg-surface border-border-subtle text-text-primary'
          : 'bg-surface border-border-subtle text-text-secondary'
      }`}
    >
      <img src={getBlueprintIcon(blueprint)} alt={blueprint.name} className="w-4 h-4 object-contain" />
      <span className="flex items-center">
        {isPriority && <span className="mr-1 text-status-warning">★</span>}
        {blueprint.name}
      </span>
      <span className={activeTab === 'recommended' ? 'text-status-success' : 'text-primary'}>x{item.needed}</span>
    </span>
  );
};

const RequiredDrops = ({ result, activeTab }: { result: StageResult, activeTab: 'recommended' | 'all' }) => {
  return (
    <div className="mt-3">
      <div className="text-caption font-bold text-text-secondary flex items-center gap-1 mb-2">
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
    <span className="flex items-center gap-1 text-caption bg-surface-bg border border-border-subtle px-2 py-0.5 rounded-full text-text-secondary">
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
    <div className="mt-2 pt-2 border-t border-border-subtle">
      <div className="text-caption font-bold text-text-secondary/70 mb-1.5">
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
      <div className="flex flex-col items-center justify-center py-24 text-text-secondary/50 text-center">
        <div className="bg-surface-bg p-6 rounded-full mb-4 border border-border-subtle">
          <Info className="w-12 h-12 opacity-20" />
        </div>
        <p className="text-body font-medium">到達範囲内にドロップステージが<br />見つかりません</p>
      </div>
    );
  }

  return (
    <>
      {activeTab === 'recommended' && (
        <div className="space-y-4 mb-6">
          <div className="p-3 bg-status-success/5 rounded-xl border border-status-success/20 text-caption text-status-success font-medium">
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
                        ? 'bg-status-success border-status-success text-white shadow-md'
                        : 'bg-surface border-status-success/20 text-status-success hover:border-status-success/40 hover:bg-status-success/5'
                    }`}
                  >
                    <div className="text-caption font-black uppercase tracking-wider opacity-80 mb-0.5">
                      Candidate {i + 1}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-small">
                      <span>{rSet.length} Stages</span>
                      <span className="opacity-50 text-caption">|</span>
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
          return (
            <div
              key={result.id}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-card-hover ${
                activeTab === 'recommended'
                  ? 'border-status-success/20 bg-surface hover:border-status-success/40'
                  : 'border-border-subtle bg-surface hover:border-primary/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-1 flex-wrap mb-1">
                    {activeTab === 'recommended' && (
                      <span className="inline-block px-2 py-0.5 bg-status-success text-white text-overline font-black rounded-full uppercase tracking-wider">
                        STEP {index + 1}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold tracking-tight text-subhead text-text-primary flex items-center gap-2">
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
