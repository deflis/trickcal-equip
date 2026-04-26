import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import type { BlueprintId } from './data/types';

describe('useStore', () => {
  beforeEach(() => {
    // 完全にクリアするために setItems([]) を使用
    const { setItems, setSelectedAttackType } = useStore.getState();
    setItems([]);
    setSelectedAttackType('all');
  });

  it('clearAll should reset requirements but keep holdings', () => {
    const { updateReq, updateHolding, clearAll } = useStore.getState();
    const id1 = '81' as BlueprintId;
    const id2 = '82' as BlueprintId;
    
    updateReq(id1, 10);
    updateHolding(id1, 5);
    updateReq(id2, 20);
    
    clearAll();
    
    const items = useStore.getState().items;
    expect(items.find(i => i.id === id1)?.req).toBe(0);
    expect(items.find(i => i.id === id1)?.held).toBe(5);
    expect(items.find(i => i.id === id2)).toBeUndefined();
  });

  it('clearRank should reset requirements of a specific rank but keep holdings', () => {
    const { updateReq, updateHolding, clearRank } = useStore.getState();
    const id8 = '81' as BlueprintId;
    const id7 = '71' as BlueprintId;
    
    updateReq(id8, 10);
    updateHolding(id8, 5);
    updateReq(id7, 10);
    updateHolding(id7, 5);
    
    clearRank(8);
    
    const items = useStore.getState().items;
    const item8 = items.find(i => i.id === id8);
    expect(item8?.req).toBe(0);
    expect(item8?.held).toBe(5);
    
    const item7 = items.find(i => i.id === id7);
    expect(item7?.req).toBe(10);
    expect(item7?.held).toBe(5);
  });

  it('updateReq should update requirement value', () => {
    const { updateReq } = useStore.getState();
    const testId = '81' as BlueprintId;
    updateReq(testId, 5);
    expect(useStore.getState().items.find(i => i.id === testId)?.req).toBe(5);
    
    updateReq(testId, -2);
    expect(useStore.getState().items.find(i => i.id === testId)?.req).toBe(3);
    
    updateReq(testId, -10);
    expect(useStore.getState().items.find(i => i.id === testId)?.req ?? 0).toBe(0);
  });

  it('updateHolding should update holding value', () => {
    const { updateHolding } = useStore.getState();
    const testId = '82' as BlueprintId;
    updateHolding(testId, 10);
    expect(useStore.getState().items.find(i => i.id === testId)?.held).toBe(10);
    
    updateHolding(testId, -3);
    expect(useStore.getState().items.find(i => i.id === testId)?.held).toBe(7);
  });

  describe('consumeHolding', () => {
    it('should subtract requirement from holding and set requirement to 0', () => {
      const { updateReq, updateHolding, consumeHolding } = useStore.getState();
      const id = '81' as BlueprintId;
      
      // 必要数 10, 所持数 15 の場合
      updateReq(id, 10);
      updateHolding(id, 15);
      
      consumeHolding(id);
      
      // 結果: 必要数 0, 所持数 5 (15 - 10)
      const item = useStore.getState().items.find(i => i.id === id);
      expect(item?.req).toBe(0);
      expect(item?.held).toBe(5);
    });

    it('should set holding to 0 if requirement is greater than holding', () => {
      const { updateReq, updateHolding, consumeHolding } = useStore.getState();
      const id = '82' as BlueprintId;
      
      // 必要数 20, 所持数 15 の場合
      updateReq(id, 20);
      updateHolding(id, 15);
      
      consumeHolding(id);
      
      // 結果: 必要数 0, 所持数 0 (15 - 20 は 0 以下)
      const item = useStore.getState().items.find(i => i.id === id);
      expect(item?.req ?? 0).toBe(0);
      expect(item?.held ?? 0).toBe(0);
    });

    it('should handle missing requirements or holdings gracefully', () => {
      const { updateHolding, consumeHolding } = useStore.getState();
      const id = '83' as BlueprintId;
      
      // 所持数のみある場合
      updateHolding(id, 10);
      consumeHolding(id);
      
      const item = useStore.getState().items.find(i => i.id === id);
      expect(item?.req).toBe(0);
      expect(item?.held).toBe(10);
    });
  });
});
