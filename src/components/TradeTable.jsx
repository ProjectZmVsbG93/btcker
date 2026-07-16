import React from 'react';

export function TradeTable({ trades, onDelete, onEdit, onDeleteAll }) {
  const exportCsv = () => {
    if (!trades || trades.length === 0) return;
    const headers = ['日付', '先物需給', 'オプション需給', 'オプション個別', 'Entry', 'Exit', 'Position', 'Entry Price', 'Exit Price', 'PnL', 'PnL%', 'MFE', 'MAE'];
    const rows = trades.map(t => [
      t.entryDate || t.date, t.futuresSupply, t.optionsTotalSupply, t.optionsIndividualSupply,
      t.entryTime || '-', t.exitTime || '-',
      t.position, t.entryPrice, t.exitPrice, t.pnl, t.pnlPercent.toFixed(2), t.mfe, t.mae
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'trades_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAll = () => {
    if (window.confirm("Are you sure you want to delete all trades? This cannot be undone.")) {
      if (onDeleteAll) onDeleteAll();
    }
  };

  if (trades.length === 0) {
    return (
      <div className="card-feature">
        <div className="flex justify-between items-center mb-xl">
          <div className="eyebrow-uppercase mb-0">Trade Log</div>
        </div>
        <p className="body-md text-mute">No trades recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card-feature" style={{ overflowX: 'auto' }}>
      <div className="flex justify-between items-center mb-xl flex-col-mobile">
        <div className="eyebrow-uppercase mb-0">Trade History</div>
        <div className="flex flex-col-mobile w-full-mobile" style={{ gap: '8px' }}>
          <button onClick={exportCsv} className="button-outline-on-dark w-full-mobile" style={{ fontSize: '14px', padding: '6px 12px' }}>Export CSV</button>
          <button onClick={handleDeleteAll} className="button-outline-on-dark w-full-mobile" style={{ fontSize: '14px', padding: '6px 12px', color: '#ff4d4f', borderColor: '#ff4d4f' }}>Delete All</button>
        </div>
      </div>
      <table className="data-table mt-xl">
        <thead>
          <tr>
            <th>Date (In-Out)</th>
            <th>Time (In-Out)</th>
            <th>Strategy</th>
            <th>Pos</th>
            <th>Supply (F/OT/OI)</th>
            <th>Price (In-Out)</th>
            <th>PnL</th>
            <th>%</th>
            <th>MFE / MAE</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[...trades].sort((a, b) => new Date(a.entryDate || a.date) - new Date(b.entryDate || b.date)).map((t) => (
            <tr key={t.id}>
              <td className="code-font">{t.entryDate || t.date}<br/>{t.exitDate || '-'}</td>
              <td className="code-font">{t.entryTime || '-'}<br/>{t.exitTime || '-'}</td>
              <td>
                <span className="button-outline-on-dark" style={{ padding: '2px 6px', fontSize: '11px', border: 'none', background: '#333' }}>
                  {t.strategy === 'futures' ? 'PbF' : t.strategy === 'opTotal' ? 'PbOT' : t.strategy === 'futAndOpTotal' ? 'PbF+O' : t.strategy === 'opIndiv' ? 'PbOI' : t.strategy || 'Manual'}
                </span>
              </td>
              <td>
                <span className="button-pill-tag" style={{ borderColor: t.position === 'Long' ? '#00d992' : t.position === 'Short' ? '#ff4d4f' : '#888' }}>
                  {t.position}
                </span>
              </td>
              <td className="code-font">{t.futuresSupply} / {t.optionsTotalSupply} / {t.optionsIndividualSupply}</td>
              <td className="code-font">{t.entryPrice} - {t.exitPrice}</td>
              <td className={`code-font ${t.pnl > 0 ? 'text-success' : t.pnl < 0 ? 'text-danger' : ''}`}>
                {t.pnl > 0 ? '+' : ''}{t.pnl}
              </td>
              <td className={`code-font ${t.pnlPercent > 0 ? 'text-success' : t.pnlPercent < 0 ? 'text-danger' : ''}`}>
                {t.pnlPercent.toFixed(2)}%
              </td>
              <td className="code-font">{t.mfe} / {t.mae}</td>
              <td className="text-right">
                <button onClick={() => onEdit(t)} className="button-outline-on-dark" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '8px', color: '#00d992', borderColor: '#00d992' }}>Edit</button>
                <button onClick={() => onDelete(t.id)} className="button-outline-on-dark" style={{ padding: '4px 8px', fontSize: '12px', color: '#ff4d4f', borderColor: '#ff4d4f' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
