import { describe, it, expect } from 'vitest';
import { addPriorityInfo } from './stageRecommendation';
import { type BlueprintId } from '../data/types';

describe('addPriorityInfo', () => {
  it('不足数が少ない方を優先する', () => {
    const input = {
      id: '1-1' as const,
      world: 1,
      level: 1,
      score: 15,
      matchingItems: [
        { id: '86' as BlueprintId, needed: 10 }, // ランク8
        { id: '76' as BlueprintId, needed: 5 },  // ランク7
      ]
    };
    const result = addPriorityInfo(input);
    expect(result.priorityItemId).toBe('76'); // 不足数5の方が優先
  });

  it('不足数が同じ場合、ランクが低い方を優先する', () => {
    const input = {
      id: '1-1' as const,
      world: 1,
      level: 1,
      score: 20,
      matchingItems: [
        { id: '86' as BlueprintId, needed: 10 }, // ランク8
        { id: '76' as BlueprintId, needed: 10 }, // ランク7
      ]
    };
    const result = addPriorityInfo(input);
    expect(result.priorityItemId).toBe('76'); // ランク7の方が優先
  });

  it('不足数もランクも同じ場合はタイブレーク（undefined）とする', () => {
    const input = {
      id: '1-1' as const,
      world: 1,
      level: 1,
      score: 20,
      matchingItems: [
        { id: '76' as BlueprintId, needed: 10 }, // ランク7
        { id: '71' as BlueprintId, needed: 10 }, // ランク7 (別の装備)
      ]
    };
    const result = addPriorityInfo(input);
    expect(result.priorityItemId).toBeUndefined();
  });

  it('アイテムが1つの場合はそれが優先される', () => {
    const input = {
      id: '1-1' as const,
      world: 1,
      level: 1,
      score: 10,
      matchingItems: [
        { id: '86' as BlueprintId, needed: 10 },
      ]
    };
    const result = addPriorityInfo(input);
    expect(result.priorityItemId).toBe('86');
  });
});
