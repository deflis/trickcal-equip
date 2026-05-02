import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AttackType, BlueprintId, ItemState, RankId } from './data/types';
import { BLUEPRINTS, RANK_CONFIG } from './data/blueprints';
import { parseSafeInt } from './utils/number';

export interface AppState {
  items: ItemState[];
  selectedRank: RankId | 'All';
  selectedAttackType: AttackType | 'all';
  maxWorld: number;
  maxStageNum: number;
  showDuplicates: boolean;
  selectedRouteIndex: number;
  routeSortOrder: 'efficiency' | 'rank';

  // Actions
  setItems: (items: ItemState[]) => void;
  setSelectedRank: (rank: RankId | 'All') => void;
  setSelectedAttackType: (type: AttackType | 'all') => void;
  setMaxWorld: (world: number) => void;
  setMaxStageNum: (num: number) => void;
  setShowDuplicates: (show: boolean) => void;
  setSelectedRouteIndex: (index: number) => void;
  setRouteSortOrder: (order: 'efficiency' | 'rank') => void;

  updateReq: (id: BlueprintId, delta: number) => void;
  setReqValue: (id: BlueprintId, value: string) => void;
  updateHolding: (id: BlueprintId, delta: number) => void;
  setHoldingValue: (id: BlueprintId, value: string) => void;

  clearItem: (id: BlueprintId) => void;
  clearHolding: (id: BlueprintId) => void;
  consumeHolding: (id: BlueprintId) => void;
  clearAll: () => void;
  clearRank: (rank: RankId) => void;
  clearRankWithSub: (rank: RankId) => void;

  applyRankConfig: (rank: RankId, attackType: AttackType | 'all') => void;
}

const updateItemInList = (items: ItemState[], id: BlueprintId, updater: (item: ItemState) => ItemState): ItemState[] => {
  const exists = items.some(i => i.id === id);
  if (!exists) {
    const newItem = updater({ id, req: 0, held: 0 });
    // reqもheldも0なら追加しない
    if (newItem.req === 0 && newItem.held === 0) return items;
    return [...items, newItem];
  }
  return items.map(i => i.id === id ? updater(i) : i).filter(i => i.req > 0 || i.held > 0);
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      items: [],
      selectedRank: 8,
      selectedAttackType: 'all',
      maxWorld: 28,
      maxStageNum: 10,
      showDuplicates: false,
      selectedRouteIndex: 0,
      routeSortOrder: 'efficiency',

      setItems: (items) => set({ items }),
      setSelectedRank: (selectedRank) => set({ selectedRank }),
      setSelectedAttackType: (selectedAttackType) => set({ selectedAttackType }),
      setMaxWorld: (maxWorld) => set({ maxWorld }),
      setMaxStageNum: (maxStageNum) => set({ maxStageNum }),
      setShowDuplicates: (showDuplicates) => set({ showDuplicates }),
      setSelectedRouteIndex: (selectedRouteIndex) => set({ selectedRouteIndex }),
      setRouteSortOrder: (routeSortOrder) => set({ routeSortOrder }),

      updateReq: (id, delta) => set((state) => ({
        items: updateItemInList(state.items, id, (i) => ({ ...i, req: Math.max(0, i.req + delta) }))
      })),

      setReqValue: (id, value) => set((state) => ({
        items: updateItemInList(state.items, id, (i) => ({
          ...i,
          req: Math.max(0, parseSafeInt(value))
        }))
      })),

      updateHolding: (id, delta) => set((state) => ({
        items: updateItemInList(state.items, id, (i) => ({ ...i, held: Math.max(0, i.held + delta) }))
      })),

      setHoldingValue: (id, value) => set((state) => ({
        items: updateItemInList(state.items, id, (i) => ({
          ...i,
          held: Math.max(0, parseSafeInt(value))
        }))
      })),

      clearItem: (id) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, req: 0 } : i).filter(i => i.req > 0 || i.held > 0)
      })),

      clearHolding: (id) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, held: 0 } : i).filter(i => i.req > 0 || i.held > 0)
      })),

      consumeHolding: (id) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, req: 0, held: Math.max(0, i.held - i.req) } : i).filter(i => i.req > 0 || i.held > 0)
      })),

      clearAll: () => set((state) => ({
        items: state.items.map(i => ({ ...i, req: 0 })).filter(i => i.held > 0),
      })),

      clearRank: (rank) => set((state) => ({
        items: state.items.map(i => i.id.startsWith(String(rank)) ? { ...i, req: 0 } : i).filter(i => i.req > 0 || i.held > 0)
      })),

      clearRankWithSub: (rank) => set((state) => {
        const subRank = String(rank - 1);
        const rankStr = String(rank);
        return {
          items: state.items.map(i =>
            i.id.startsWith(rankStr) || i.id.startsWith(subRank) ? { ...i, req: 0 } : i
          ).filter(i => i.req > 0 || i.held > 0)
        };
      }),

      applyRankConfig: (rank, selectedAttackType) => {
        if (selectedAttackType === 'all') return;

        const config = RANK_CONFIG[rank];
        if (!config) return;

        set((state) => {
          // 同じランクのアイテムの必要数を一旦すべて0にする（切り替えを実現）
          // 所持数は維持したいので、reqのみを操作する
          const baseItems = state.items.map(item => {
            const bp = BLUEPRINTS.find(b => b.id === item.id);
            if (bp && (bp.rank === rank || bp.rank === rank - 1)) {
              return { ...item, req: 0 };
            }
            return item;
          });

          const nextItems = [...baseItems];

          BLUEPRINTS
            .filter(b => (b.rank === rank || b.rank === rank - 1) && (b.attackType === selectedAttackType || b.attackType === 'both'))
            .forEach(b => {
              const amount = b.rank === rank ? config.main : config.sub;
              if (amount > 0) {
                const idx = nextItems.findIndex(i => i.id === b.id);
                if (idx > -1) {
                  nextItems[idx] = { ...nextItems[idx], req: amount };
                } else {
                  nextItems.push({ id: b.id, req: amount, held: 0 });
                }
              }
            });

          return { items: nextItems.filter(i => i.req > 0 || i.held > 0) };
        });
      }
    }),
    {
      name: 'trickcal-equip-storage',
    }
  )
);
