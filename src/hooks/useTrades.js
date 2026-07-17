import { useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'systematic_trades_data';

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse trades from local storage', e);
      }
    }
    return [];
  });
  const [filters, setFilters] = useState({
    futures: 'all', // 'all', '+', '-'
    optionsTotal: 'all', // 'all', '+', '-'
    optionsIndividual: 'all', // 'all', '+', '-'
    matchType: 'any', // 'any', 'all' - for combining filters
    strategy: 'futAndOpTotal'
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  const addTrade = (tradeData) => {
    const newTrade = {
      ...tradeData,
      id: crypto.randomUUID(),
      pnl: calculatePnl(tradeData),
      pnlPercent: calculatePnlPercent(tradeData)
    };
    setTrades(prev => [...prev, newTrade]);
  };

  const updateTrade = (id, tradeData) => {
    setTrades(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...tradeData,
          pnl: calculatePnl(tradeData),
          pnlPercent: calculatePnlPercent(tradeData)
        };
      }
      return t;
    }));
  };

  const deleteTrade = (id) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const deleteAllTrades = () => {
    setTrades([]);
  };

  const calculatePnl = (t) => {
    if (t.position === 'NA') return 0;
    const pnl = t.position === 'Long' 
      ? Number(t.exitPrice) - Number(t.entryPrice)
      : Number(t.entryPrice) - Number(t.exitPrice);
    return isNaN(pnl) ? 0 : pnl;
  };

  const calculatePnlPercent = (t) => {
    if (t.position === 'NA') return 0;
    const pnl = calculatePnl(t);
    const percent = (pnl / Number(t.entryPrice)) * 100;
    return isNaN(percent) ? 0 : percent;
  };

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      let strategyMatch = true;
      if (filters.strategy !== 'all') {
        strategyMatch = t.strategy === filters.strategy;
      }

      let fMatch = true;
      if (filters.futures !== 'all') fMatch = t.futuresSupply === filters.futures;
      let otMatch = true;
      if (filters.optionsTotal !== 'all') otMatch = t.optionsTotalSupply === filters.optionsTotal;
      let oiMatch = true;
      if (filters.optionsIndividual !== 'all') oiMatch = t.optionsIndividualSupply === filters.optionsIndividual;

      // When specifically asked for "all match +/-"
      if (filters.matchType === 'allMatchPlus') {
         return strategyMatch && t.futuresSupply === '+' && t.optionsTotalSupply === '+' && t.optionsIndividualSupply === '+';
      }
      if (filters.matchType === 'allMatchMinus') {
         return strategyMatch && t.futuresSupply === '-' && t.optionsTotalSupply === '-' && t.optionsIndividualSupply === '-';
      }
      if (filters.matchType === 'futAndOptTotal') {
        return strategyMatch && ((t.futuresSupply === '+' && t.optionsTotalSupply === '+') || 
                                 (t.futuresSupply === '-' && t.optionsTotalSupply === '-'));
      }
      if (filters.matchType === 'futuresOnly') {
        return strategyMatch && fMatch;
      }
      if (filters.matchType === 'opTotalOnly') {
        return strategyMatch && otMatch;
      }

      // Default combination logic
      return strategyMatch && fMatch && otMatch && oiMatch;
    });
  }, [trades, filters]);

  const stats = useMemo(() => {
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.entryDate || a.date) - new Date(b.entryDate || b.date));
    if (sortedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgPnl: 0,
        avgProfit: 0,
        avgLoss: 0,
        avgMfe: 0,
        avgMae: 0,
        tradeCount: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        cumulativePnlData: []
      };
    }
    let wins = 0;
    let sumPnl = 0;
    let sumMfe = 0;
    let sumMae = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    let currentEquity = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    let baselineNikkeiPrice = null;

    const cumulativePnlData = [];

    let validTrades = 0;

    sortedTrades.forEach((t) => {
      if (t.position === 'NA') return;
      
      validTrades++;
      const pnl = Number(t.pnl);
      const mfe = Number(t.mfe) || 0;
      const mae = Number(t.mae) || 0;

      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else {
        grossLoss += Math.abs(pnl);
      }

      sumPnl += pnl;
      sumMfe += mfe;
      sumMae += mae;

      currentEquity += pnl;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = peakEquity - currentEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      if (baselineNikkeiPrice === null && t.entryPrice) {
        baselineNikkeiPrice = Number(t.entryPrice);
      }

      const currentNikkeiPrice = Number(t.exitPrice) || Number(t.entryPrice) || baselineNikkeiPrice;
      const nikkeiEquity = (currentNikkeiPrice && baselineNikkeiPrice) ? (currentNikkeiPrice - baselineNikkeiPrice) : 0;

      cumulativePnlData.push({
        name: t.entryDate || t.date || `Trade ${validTrades}`,
        equity: currentEquity,
        pnl: pnl,
        nikkeiEquity: nikkeiEquity
      });
    });

    const avgPnl = validTrades ? sumPnl / validTrades : 0;
    
    // Sharpe Ratio (simplified): Avg PnL / StdDev(PnL)
    const variance = sortedTrades.filter(t => t.position !== 'NA').reduce((acc, t) => acc + Math.pow(Number(t.pnl) - avgPnl, 2), 0) / (validTrades || 1);
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : avgPnl / stdDev;

    return {
      totalTrades: validTrades,
      winRate: validTrades ? (wins / validTrades) * 100 : 0,
      avgPnl,
      avgProfit: wins > 0 ? grossProfit / wins : 0,
      avgLoss: (validTrades - wins) > 0 ? grossLoss / (validTrades - wins) : 0,
      avgMfe: validTrades ? sumMfe / validTrades : 0,
      avgMae: validTrades ? sumMae / validTrades : 0,
      tradeCount: validTrades,
      sharpeRatio,
      profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
      maxDrawdown,
      cumulativePnlData
    };
  }, [filteredTrades]);

  return {
    trades,
    filteredTrades,
    stats,
    filters,
    setFilters,
    addTrade,
    updateTrade,
    deleteTrade,
    deleteAllTrades
  };
}
