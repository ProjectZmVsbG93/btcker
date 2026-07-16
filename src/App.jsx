import React, { useState } from 'react';
import { useTrades } from './hooks/useTrades';
import { Dashboard } from './components/Dashboard';
import { FilterPanel } from './components/FilterPanel';
import { TradeForm } from './components/TradeForm';
import { TradeTable } from './components/TradeTable';
import { WhatIfPanel } from './components/WhatIfPanel';
import { useWhatIf } from './hooks/useWhatIf';

function App() {
  const {
    trades,
    filteredTrades,
    stats,
    filters,
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    deleteAllTrades
  } = useTrades();

  const [csvData, setCsvData] = useState([]);
  const [editingTrade, setEditingTrade] = useState(null);

  const { whatIfSettings, setWhatIfSettings, whatIfStats } = useWhatIf(filteredTrades, csvData);

  return (
    <div className="layout">
      <header className="hero-band">
        <div className="container">
          <div className="eyebrow-uppercase">Nikkei 225 Futures & Options</div>
          <h1 className="display-lg">Backtest Analytics</h1>
          <p className="body-md text-mute">Analyze and visualize.</p>
        </div>
      </header>

      <main className="content-band">
        <div className="container">
          <Dashboard stats={stats} trades={filteredTrades} whatIfStats={whatIfStats} />
          
          <WhatIfPanel settings={whatIfSettings} setSettings={setWhatIfSettings} csvData={csvData} />

          <div className="grid grid-cols-2 mb-xl flex-col-mobile" style={{ gap: '24px', alignItems: 'start' }}>
            <TradeForm 
              onAdd={addTrade} 
              onUpdate={updateTrade} 
              editingTrade={editingTrade} 
              clearEdit={() => setEditingTrade(null)}
              csvData={csvData}
              setCsvData={setCsvData}
            />
            <FilterPanel filters={filters} setFilters={setFilters} />
          </div>

          <div className="card-feature">
            <TradeTable 
              trades={filteredTrades} 
              onDelete={deleteTrade} 
              onEdit={setEditingTrade} 
              onDeleteAll={deleteAllTrades}
            />
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          Systematic Trading Backtest Dashboard &copy; 2026
        </div>
      </footer>
    </div>
  )
}

export default App;

