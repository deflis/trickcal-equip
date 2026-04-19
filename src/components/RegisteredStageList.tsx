import { STAGES } from '../stages';

export const RegisteredStageList = () => {
  const registeredStages = STAGES.filter(s => s.drops.length > 0);
  
  // エリアごとにグループ化
  const groupedStages = registeredStages.reduce((acc, stage) => {
    const [world] = stage.id.split('-');
    if (!acc[world]) acc[world] = [];
    acc[world].push(stage.id);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        Data Registered Worlds ({Object.keys(groupedStages).length})
      </h3>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {Object.entries(groupedStages).map(([world, stageIds]) => (
          <div key={world} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-300">W{world}</span>
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {stageIds.map(id => (
                <span 
                  key={id} 
                  className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[9px] text-slate-300 italic">
        ※データが入力されているステージのみを表示しています。
      </p>
    </div>
  );
};
