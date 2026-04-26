import { describe, it, expect } from 'vitest';
import { selectShortages, selectAllStages, selectTotalJoseki } from './selectors';
import type { AppState } from './store';
import type { BlueprintId } from './data/types';
import { getCombinationKey } from './logic/stageRecommendation';

describe('selectors', () => {
  describe('selectTotalJoseki', () => {
    it('should calculate total Joseki correctly', () => {
      const id81 = '81' as BlueprintId; // Rank 8 (24 Joseki)
      const id71 = '71' as BlueprintId; // Rank 7 (22 Joseki)

      const state = {
        items: [
          { id: id81, req: 10, held: 5 }, // 5 * 24 = 120
          { id: id71, req: 5, held: 3 },  // 2 * 22 = 44
        ]
      } as unknown as AppState;

      const totalJoseki = selectTotalJoseki(state);
      expect(totalJoseki).toBe(164);
    });
  });

  describe('selectShortages', () => {
    it('should calculate correct shortages based on items state', () => {
      const id1 = '81' as BlueprintId;
      const id2 = '82' as BlueprintId;
      const id3 = '83' as BlueprintId;
      const id4 = '84' as BlueprintId;

      const state = {
        items: [
          { id: id1, req: 10, held: 5 }, // 不足 5
          { id: id2, req: 5, held: 10 }, // 不足なし
          { id: id3, req: 8, held: 0 },  // 不足 8
          { id: id4, req: 0, held: 20 }, // 要件なし
        ]
      } as unknown as AppState;

      const shortages = selectShortages(state);

      expect(shortages).toEqual(expect.arrayContaining([
        { id: id1, amount: 5 },
        { id: id3, amount: 8 },
      ]));
      expect(shortages.length).toBe(2);
    });

    it('should return an empty array if all requirements are met', () => {
      const id = '81' as BlueprintId;
      const state = {
        items: [
          { id, req: 5, held: 5 },
        ]
      } as unknown as AppState;

      const shortages = selectShortages(state);
      expect(shortages).toEqual([]);
    });
  });

  describe('selectAllStages with duplicate filtering', () => {
    // 擬似的なAppStateを作成
    const baseState = {
      items: [
        { id: '81', req: 1, held: 0 },
        { id: '82', req: 1, held: 0 }
      ],
      maxWorld: 28,
      maxStageNum: 10,
    };

    it('should return all stages (including duplicates) when showDuplicates is true', () => {
      // 擬似的なデータ: 81 と 82 を両方落とすステージが複数ある場合
      const state = { ...baseState, showDuplicates: true } as unknown as AppState;
      const stages = selectAllStages(state);
      
      // 同じアイテムセットを持つステージが複数含まれている可能性があることを確認
      const combinations = new Map<string, number>();
      stages.forEach(s => {
        const key = getCombinationKey(s.matchingItems, s.otherDrops);
        combinations.set(key, (combinations.get(key) || 0) + 1);
      });
      
      // 81, 82 をドロップするステージは実データ上で複数存在するため、重複があるはず
      const counts = Array.from(combinations.values());
      const hasDuplicate = counts.some(count => count > 1);
      expect(hasDuplicate).toBe(true);
    });

    it('should filter out identical drop combinations when showDuplicates is false', () => {
      const state = { ...baseState, showDuplicates: false } as unknown as AppState;
      const stages = selectAllStages(state);
      
      // 同一組み合わせの重複がないこと
      const combinations = new Set();
      stages.forEach(s => {
        const key = getCombinationKey(s.matchingItems, s.otherDrops);
        expect(combinations.has(key)).toBe(false);
        combinations.add(key);
      });

      // すべての必要アイテムが（ユニークな組み合わせを通じて）カバーされていること
      const covered = new Set();
      stages.forEach(s => s.matchingItems.forEach(m => covered.add(m.id)));
      expect(covered.has('81')).toBe(true);
      expect(covered.has('82')).toBe(true);
    });
  });
});
