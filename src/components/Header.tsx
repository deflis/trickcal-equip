import { Calculator } from 'lucide-react';

export const Header = () => (
  <header className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-indigo-700 flex items-center justify-center gap-2">
      <Calculator className="w-8 h-8" />
      トリッカル 周回ルート計算機
    </h1>
    <p className="text-slate-500 mt-2 italic text-sm">
      最高到達ステージに合わせて最適な周回ステージを提案します
    </p>
  </header>
);
