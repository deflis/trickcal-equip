import { range } from '../array';
import { STAGES_BY_WORLD } from '../stages';
import { MIN_WORLD, MAX_WORLD } from '../types';

const groupedStages = range(MIN_WORLD, MAX_WORLD).map((level) => {
  const stages = range(1, 10).filter(number => {
    return STAGES_BY_WORLD[level][number].drops.length > 0;
  }).map(num => `${level}-${num}`);
  return [level, stages] as const;
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
            <div className="flex flex-wrap gap-1 max-w-50">
              {stageIds.map(id => (
                <span 
                  key={id} 
                  className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                >
                  {world}-{id}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
