import { useState } from 'react';
import { ChevronDown, LayoutList } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(true);
  const [collapsedWorlds, setCollapsedWorlds] = useState<Set<number>>(new Set());

  const toggleWorld = (world: number) => {
    const next = new Set(collapsedWorlds);
    if (next.has(world)) {
      next.delete(world);
    } else {
      next.add(world);
    }
    setCollapsedWorlds(next);
  };

  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group py-2"
      >
        <h3 className="text-text-secondary text-[10px] font-display font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-text-primary transition-colors">
          <LayoutList className="w-3 h-3" />
          データが入力されているステージ ({groupedStages.length})
        </h3>
        <div className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}>
          <ChevronDown className="w-4 h-4 text-border-subtle group-hover:text-text-secondary" />
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-wrap gap-x-8 gap-y-6 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {groupedStages.map(([world, stageIds]) => {
            const isCollapsed = collapsedWorlds.has(world);
            
            return (
              <div key={world} className="flex flex-col gap-2">
                <button 
                  onClick={() => toggleWorld(world)}
                  className="flex items-center gap-1.5 self-start group"
                >
                  <span className={`text-[10px] font-bold transition-colors ${isCollapsed ? 'text-text-secondary/50 group-hover:text-text-secondary' : 'text-text-secondary group-hover:text-primary'}`}>
                    WORLD {world}
                  </span>
                  <div className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                    <ChevronDown className={`w-3 h-3 ${isCollapsed ? 'text-border-subtle' : 'text-text-secondary'}`} />
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="flex flex-wrap gap-2 max-w-[24rem] animate-in fade-in slide-in-from-left-1 duration-200">
                    {stageIds.map(id => {
                      const stageData = STAGES_BY_WORLD[world as keyof typeof STAGES_BY_WORLD][id as keyof (typeof STAGES_BY_WORLD)[3]];
                      return (
                        <div 
                          key={id} 
                          className="flex flex-col items-center gap-1 bg-surface px-2 py-1.5 rounded-md border border-border-subtle shadow-sm hover:border-primary/30 hover:-translate-y-[1px] transition-all"
                        >
                          <span className="text-[9px] font-bold text-text-secondary">
                            {world}-{id}
                          </span>
                          <div className="flex gap-1">
                            {stageData.drops.map((dropId, i) => {
                              const blueprint = BLUEPRINTS.find(b => b.id === dropId)
                              if (!blueprint) return null;
                              return (
                                <img 
                                  key={i} 
                                  src={getBlueprintIcon(blueprint)} 
                                  alt={blueprint.name}
                                  title={blueprint.name}
                                  className="w-4 h-4 object-contain opacity-90" 
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
