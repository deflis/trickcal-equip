# 一緒にやろうよトリッカル

『[トリッカル・もちもちほっペ大作戦（グローバル版）](https://trickcal.biligames.com/jp/)』の装備集めを効率化するための最適ルート計算ツールです。
必要な設計図を選択すると、最小のスタミナ消費で効率よく集められる周回ルートを提案します。
AIで作ったので何か間違いがあるかも知れないです。

## 特徴

- **最適周回ルートの計算**: ビットマスクDP（動的計画法）アルゴリズムを使用し、最小のステージ数ですべての必要素材をカバーできるルートを算出します。
- **スマートなソート**: スタミナ消費が全ステージ一律であることを考慮し、基本的にはドロップ率が高いと思われる高ワールドのステージを優先します。
- **効率的なワークフロー**:
    - **必要数・所持数の管理**: 各設計図ごとの必要数と現在の所持数を入力。
    - **不足数の自動計算**: `不足数 = max(0, 必要数 - 所持数)` として計算。
    - **消費（⚡消費）機能**: 所持数分を必要数から差し引き、所持数をクリアします（装備を作成した状態をシミュレート）。
- **分析パネルのバッジ**:
    - <kbd style="background-color: #16a34a; color: white; padding: 2px 4px; border-radius: 4px;">TOP LEVEL</kbd> : 候補の中で最もワールドレベルが高いステージ。
    - <kbd style="background-color: #d97706; color: white; padding: 2px 4px; border-radius: 4px;">BEST SCORE</kbd> : 不足素材のドロップ期待値が最も高いステージ。

## 技術スタック

- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4, Lucide React (アイコン)
- **State Management**: Zustand, Reselect
- **Quality**: Vitest (テスト), Oxlint (リンター)

## 使い方

### 開発環境のセットアップ

```bash
pnpm install
pnpm dev
```

### ビルド・プレビュー

```bash
pnpm build
pnpm preview
```

### テスト・リンター

```bash
pnpm test
pnpm lint
```

## プロジェクト構造

- `src/logic/`: ルート最適化アルゴリズム（ビットマスクDP）
- `src/components/`: UIコンポーネント（分析パネル、設計図リスト等）
- `src/store.ts`: Zustandによる状態管理と、Reselectによる計算ロジックのメモ化
- `src/blueprints.ts`: ランクごとの設計図データ定義
- `src/stages.ts`: 各ステージのドロップアイテムデータ
- `src/types.ts`: 型定義（RankId 2〜8など）
