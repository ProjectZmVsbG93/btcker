import React, { useMemo } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ZAxis } from 'recharts';

export function Dashboard({ stats, trades, whatIfStats }) {
  const chartData = useMemo(() => {
    if (!stats || !stats.cumulativePnlData) return [];
    if (!whatIfStats || !whatIfStats.cumulativePnlData) return stats.cumulativePnlData;
    
    return stats.cumulativePnlData.map((point, index) => {
      const whatIfPoint = whatIfStats.cumulativePnlData[index];
      return {
        ...point,
        whatIfEquity: whatIfPoint ? whatIfPoint.whatIfEquity : null
      };
    });
  }, [stats, whatIfStats]);

  // Scatter plot data
  const scatterData = useMemo(() => {
    if (whatIfStats && whatIfStats.scatterData) {
      return whatIfStats.scatterData;
    }
    return (trades || []).map((t, index) => ({
      name: t.entryDate || t.date || `Trade ${index + 1}`,
      mae: Number(t.mae) || 0,
      mfe: Number(t.mfe) || 0,
      pnl: Number(t.pnl) || 0,
      position: t.position
    }));
  }, [trades, whatIfStats]);

  // Custom tooltip for scatter plot
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3a39', padding: '10px', borderRadius: '6px' }}>
          <p className="code-font" style={{ color: '#f2f2f2', margin: 0 }}>{data.name}</p>
          <p className="code-font" style={{ color: data.pnl > 0 ? '#00d992' : '#ff4d4f', margin: '4px 0' }}>
            PnL: {data.pnl > 0 ? '+' : ''}{data.pnl}
          </p>
          <p className="code-font" style={{ color: '#b8b3b0', margin: 0 }}>MAE: {data.mae}</p>
          <p className="code-font" style={{ color: '#b8b3b0', margin: 0 }}>MFE: {data.mfe}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard mb-xl">
      <div className="grid grid-cols-4 mb-xl">
        <div className="card-feature">
          <div className="eyebrow-mono">Win Rate</div>
          <div className="display-md text-success">{stats.winRate.toFixed(1)}%</div>
          <div className="body-sm text-mute">{stats.tradeCount} trades total</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Avg PnL</div>
          <div className="display-md">{stats.avgPnl.toFixed(2)}</div>
          <div className="body-sm text-mute">Per trade</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Profit Factor</div>
          <div className="display-md">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
          <div className="body-sm text-mute">Gross Profit / Gross Loss</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Sharpe Ratio</div>
          <div className="display-md">{stats.sharpeRatio.toFixed(2)}</div>
          <div className="body-sm text-mute">Simple ratio</div>
        </div>
      </div>

      <div className="grid grid-cols-5 mb-xl">
         <div className="card-feature">
          <div className="eyebrow-mono">Avg MFE</div>
          <div className="display-md text-success">+{stats.avgMfe.toFixed(2)}</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Avg MAE</div>
          <div className="display-md text-danger">{stats.avgMae.toFixed(2)}</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Avg Profit</div>
          <div className="display-md text-success">+{stats.avgProfit.toFixed(2)}</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Avg Loss</div>
          <div className="display-md text-danger">-{stats.avgLoss.toFixed(2)}</div>
        </div>
        <div className="card-feature">
          <div className="eyebrow-mono">Max Drawdown</div>
          <div className="display-md text-danger">-{stats.maxDrawdown.toFixed(2)}</div>
        </div>
      </div>

      {whatIfStats && (
        <div className="card-feature-emphasized mb-xl" style={{ borderColor: '#f59e0b' }}>
          <div className="eyebrow-uppercase" style={{ color: '#f59e0b' }}>What-If Simulation Results</div>
          <div className="grid grid-cols-4 mt-md mb-xl">
            <div>
              <div className="eyebrow-mono">Win Rate</div>
              <div className="display-sm text-success">{whatIfStats.winRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="eyebrow-mono">Avg PnL</div>
              <div className="display-sm">{whatIfStats.avgPnl.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Profit Factor</div>
              <div className="display-sm">{whatIfStats.profitFactor === Infinity ? '∞' : whatIfStats.profitFactor.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Sharpe Ratio</div>
              <div className="display-sm">{whatIfStats.sharpeRatio.toFixed(2)}</div>
            </div>
          </div>
          <div className="grid grid-cols-5 mt-md">
            <div>
              <div className="eyebrow-mono">Avg MFE</div>
              <div className="display-sm text-success">+{whatIfStats.avgMfe.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Avg MAE</div>
              <div className="display-sm text-danger">{whatIfStats.avgMae.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Avg Profit</div>
              <div className="display-sm text-success">+{whatIfStats.avgProfit.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Avg Loss</div>
              <div className="display-sm text-danger">-{whatIfStats.avgLoss.toFixed(2)}</div>
            </div>
            <div>
              <div className="eyebrow-mono">Max Drawdown</div>
              <div className="display-sm text-danger">-{whatIfStats.maxDrawdown.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 mb-xl flex-col-mobile" style={{ gap: '24px' }}>
        <div className="card-feature">
          <div className="eyebrow-uppercase">Equity Curve vs Nikkei B&H</div>
          <div style={{ width: '100%', height: 350, marginTop: '24px' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3a39" />
                <XAxis dataKey="name" stroke="#8b949e" tick={{fontSize: 12}} />
                <YAxis stroke="#8b949e" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3a39' }}
                  itemStyle={{ color: '#00d992' }}
                />
                <Line type="monotone" dataKey="equity" name="Strategy Equity" stroke="#00d992" strokeWidth={2} dot={false} />
                {whatIfStats && (
                  <Line type="monotone" dataKey="whatIfEquity" name="What-If Equity" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                )}
                <Line type="monotone" dataKey="nikkeiEquity" name="Nikkei B&H" stroke="#00bfff" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-feature">
          <div className="eyebrow-uppercase">
            {whatIfStats ? 'What-If MAE / MFE Distribution' : 'MAE / MFE Distribution'}
          </div>
          <div style={{ width: '100%', height: 350, marginTop: '24px' }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3a39" />
                <XAxis type="number" dataKey="mae" name="MAE" stroke="#8b949e" tick={{fontSize: 12}} tickFormatter={(val) => val.toFixed(0)} />
                <YAxis type="number" dataKey="mfe" name="MFE" stroke="#8b949e" tick={{fontSize: 12}} tickFormatter={(val) => val.toFixed(0)} />
                <ZAxis type="number" range={[60, 60]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                <ReferenceLine x={0} stroke="#b8b3b0" opacity={0.5} />
                <ReferenceLine y={0} stroke="#b8b3b0" opacity={0.5} />
                <Scatter name="Trades" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? '#00d992' : '#ff4d4f'} opacity={0.8} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
