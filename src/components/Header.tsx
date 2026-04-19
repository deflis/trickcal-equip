import { Calculator, ExternalLink } from 'lucide-react';

export const Header = () => (
  <header className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-indigo-700 flex items-center justify-center gap-2">
      <Calculator className="w-8 h-8" />
      トリッカル ルート計算機
    </h1>
    <p className="text-slate-500 mt-2 text-sm">
      みんなのキュウリ植え🥒をサポートするための、トリッカル装備周回ルート計算機です。同人作品🦋です。
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      <a
        href="https://trickcal.biligames.com/jp/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 transition-all text-xs border border-indigo-200 shadow-sm font-medium"
      >
        <span>一緒にやろうよトリッカル（公式サイト）</span>
      </a>
      <a
        href="https://github.com/deflis/trickcal-equip"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105 transition-all text-xs border border-slate-200 shadow-sm"
      >
        <span>データの更新や機能改善へのご協力をお待ちしております</span>
      </a>
    </div>
  </header>
);
