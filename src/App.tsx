import { Header } from './components/Header';
import { QuickActionPanel } from './components/QuickActionPanel';
import { BlueprintList } from './components/BlueprintList';
import { AnalysisPanel } from './components/AnalysisPanel';


const App = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">

        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <section className="lg:col-span-7 space-y-4">
            <QuickActionPanel />
            <BlueprintList />
          </section>

          <section className="lg:col-span-5 space-y-4">
            <AnalysisPanel />
          </section>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
