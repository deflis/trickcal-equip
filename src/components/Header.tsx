import { Calculator } from 'lucide-react';

export const Header = () => (
  <header className="mb-8 text-center">
    <h1 className="text-section font-display font-bold tracking-tight text-primary flex items-center justify-center gap-2">
      <Calculator className="w-8 h-8" />
      トリッカル ルート計算機
    </h1>
    <p className="text-text-secondary mt-2 text-body">
      みんなのキュウリ植え🥒をサポートするための、トリッカル装備周回ルート計算機です。同人作品🦋です。
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      <a
        href="https://trickcal.biligames.com/jp/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:-translate-y-[2px] transition-all text-small border border-primary/20 font-medium hover:shadow-card-hover"
      >
        <span>一緒にやろうよトリッカル（公式サイト）</span>
      </a>
      <a
        href="https://github.com/deflis/trickcal-equip"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface text-text-secondary hover:bg-surface-bg hover:-translate-y-[2px] transition-all text-small border border-border-subtle hover:shadow-card-hover"
      >
        <span>データの更新や機能改善へのご協力をお待ちしております</span>
      </a>
    </div>
  </header>
);
