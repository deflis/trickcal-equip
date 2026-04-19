import type { IntRange } from "type-fest";

// --- Wiki準拠のデータ定義 ---
export type RankId = IntRange<2, 9>;
export type RankKey = `${RankId}`;

export const MAX_RANK = 8 satisfies RankId;


export type ItemConfig = {
  main: number; // ランクごとの必要枚数
  sub: number;  // 1ランク下の装備の必要枚数
};
export type EquipTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AttackType = 'physical' | 'magic' | 'both';

export type EquipType = {
  id: EquipTypeId;
  name: string;
  attackType: AttackType;
};

export type BlueprintId = `${RankId}${EquipTypeId}`;

export interface Blueprint {
  id: BlueprintId;
  name: string;
  rank: RankId;
  type: string;
  typeId: EquipTypeId;
  attackType: AttackType;
}

export type BlueprintWithState = Blueprint & {
  req: number;
  held: number;
  shortage: number;
  isComplete: boolean;
};


// Stage2まではランク1の装備がドロップするため、ランク2以上の装備のみを対象とする
export type StageLevel = IntRange<3, 29>;
export type StageNumber = IntRange<1, 11>;

export type DropId = BlueprintId;

export type ItemState = {
  id: BlueprintId;
  req: number;
  held: number;
};

export type ShortageItem = {
  id: BlueprintId;
  amount: number;
};

export type ShortageMap = Map<BlueprintId, number>;

export type Stage = {
  id: `${StageLevel}-${StageNumber}`;
  drops: DropId[];
};

export type Stages = {
  [key in StageLevel]?: {
    [key in StageNumber]?: Omit<Stage, "id">;
  }
}

export type MatchingItem = {
  id: string;
  name: string | undefined;
  needed: number;
};

export type OtherDrop = {
  id: string;
  name: string | undefined;
};

export type StageResult = {
  id: string;
  score: number;
  matchingItems: MatchingItem[];
  otherDrops?: OtherDrop[];
  worldLevel?: number;
  priorityItemId?: string;
  minNeededOfMaxRank?: number;
};
