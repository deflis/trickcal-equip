import { Calculator, Github } from 'lucide-react';

export const Header = () => (
  <header className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-indigo-700 flex items-center justify-center gap-2">
      <Calculator className="w-8 h-8" />
      トリッカル 周回ルート計算機
    </h1>
    <p className="text-slate-500 mt-2 italic text-sm">
      最高到達ステージに合わせて最適な周回ステージを提案します
    </p>
    <div className="mt-4 flex justify-center">
      <a
        href="https://github.com/deflis/trickcal-equip"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-xs border border-slate-200 shadow-sm"
      >
        <Github className="w-4 h-4" />
        <span>データの更新や機能改善へのご協力をお待ちしております</span>
      </a>
    </div>
  </header>
);
