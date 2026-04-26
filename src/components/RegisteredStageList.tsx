import { range } from '../data/array';
import { STAGES_BY_WORLD } from '../data/stages';
import { MIN_WORLD, MAX_WORLD } from '../data/types';
import { getBlueprintIcon, BLUEPRINTS } from '../data/blueprints';

const groupedStages = range(MIN_WORLD, MAX_WORLD).map((world) => {
  const stages = range(1, 10).filter(stage => {
    return STAGES_BY_WORLD[world][stage].drops.length > 0;
  });
  return [world, stages] as const;
}).filter(([, stageIds]) => stageIds.length > 0);



export const RegisteredStageList = () => {
  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        データが入力されているステージ ({groupedStages.length})
      </h3>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {groupedStages.map(([world, stageIds]) => (
          <div key={world} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-300">W{world}</span>
            <div className="flex flex-wrap gap-1.5 max-w-[20rem]">
              {stageIds.map(id => {
                const stageData = STAGES_BY_WORLD[world as keyof typeof STAGES_BY_WORLD][id as keyof (typeof STAGES_BY_WORLD)[3]];
                return (
                  <div 
                    key={id} 
                    className="flex flex-col items-center gap-0.5 bg-slate-50 px-1.5 py-1 rounded border border-slate-100"
                  >
                    <span className="text-[9px] font-medium text-slate-400">
                      {world}-{id}
                    </span>
                    <div className="flex gap-0.5">
                      {stageData.drops.map((dropId, i) => {
                        const blueprint = BLUEPRINTS.find(b => b.id === dropId)
                        return (
                          <img 
                            key={i} 
                            src={getBlueprintIcon(blueprint!)} 
                            alt={blueprint?.name ?? 'unknown'}
                            title={blueprint?.name}
                            className="w-4 h-4 object-contain opacity-80" 
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
