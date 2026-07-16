import { useState, useMemo } from 'react';

const normalizeDate = (dStr) => {
  if (!dStr) return '';
  const parts = dStr.split(/[-/]/);
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return dStr;
};

const normalizeTime = (tStr) => {
  if (!tStr) return '';
  const parts = tStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return tStr;
};

export function useWhatIf(filteredTrades, csvData) {
  const [whatIfSettings, setWhatIfSettings] = useState({
    active: false,
    pattern: 'fixed', // 'fixed', 'trailing', 'breakeven'
    fixedTp: 500,
    fixedSl: 500,
    trailAct: 1000,
    trailRev: 500,
    beAct: 500,
    beMoveTo: 0
  });

  const whatIfStats = useMemo(() => {
    if (!whatIfSettings.active || csvData.length === 0 || filteredTrades.length === 0) {
      return null;
    }

    const uniqueDates = [...new Set(csvData.map(r => normalizeDate(r['日付'])))].sort((a, b) => new Date(a) - new Date(b));
    
    const getTradingDate = (calDateStr, timeStr) => {
      if (!calDateStr || !timeStr) return normalizeDate(calDateStr);
      const calDate = new Date(calDateStr);
      const timeNum = parseInt(timeStr.replace(':', ''), 10);
      
      if (timeNum >= 800 && timeNum < 1700) {
        return normalizeDate(calDateStr);
      } else if (timeNum >= 1700) {
        for (const d of uniqueDates) {
          if (new Date(d) > calDate) return d;
        }
      } else if (timeNum <= 600) {
        for (const d of uniqueDates) {
          if (new Date(d) >= calDate) return d;
        }
      }
      return normalizeDate(calDateStr);
    };

    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.entryDate || a.date) - new Date(b.entryDate || b.date));

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let currentEquity = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    let validTrades = 0;
    let sumMfe = 0;
    let sumMae = 0;
    const pnlArray = [];
    const cumulativePnlData = [];
    const scatterData = [];

    sortedTrades.forEach((t) => {
      if (t.position === 'NA') return;

      const eTradingDate = getTradingDate(t.entryDate || t.date, t.entryTime);
      const xTradingDate = getTradingDate(t.exitDate || t.date, t.exitTime);
      const eTimeStr = normalizeTime(t.entryTime);
      const xTimeStr = normalizeTime(t.exitTime);

      const startIndex = csvData.findIndex(row => 
        normalizeDate(row['日付']) === eTradingDate && normalizeTime(row['時間']) === eTimeStr
      );
      const exitIndex = csvData.findIndex(row => 
        normalizeDate(row['日付']) === xTradingDate && normalizeTime(row['時間']) === xTimeStr
      );

      if (startIndex === -1 || exitIndex === -1 || startIndex > exitIndex) return;

      const entryPrice = Number(csvData[startIndex]['始値']);
      let simExitPrice = Number(csvData[exitIndex]['始値']);
      let triggered = false;

      let maxProfitPrice = entryPrice;
      let trailingActive = false;
      let beActive = false;
      
      let maxHigh = -Infinity;
      let minLow = Infinity;

      for (let k = startIndex; k < exitIndex; k++) {
        const bar = csvData[k];
        const high = Number(bar['高値']);
        const low = Number(bar['安値']);
        
        if (high > maxHigh) maxHigh = high;
        if (low < minLow) minLow = low;

        if (whatIfSettings.pattern === 'fixed') {
          if (t.position === 'Long') {
            const isTp = high >= entryPrice + Number(whatIfSettings.fixedTp);
            const isSl = low <= entryPrice - Number(whatIfSettings.fixedSl);
            if (isTp && isSl) {
              simExitPrice = entryPrice - Number(whatIfSettings.fixedSl);
              triggered = true; break;
            } else if (isSl) {
              simExitPrice = entryPrice - Number(whatIfSettings.fixedSl);
              triggered = true; break;
            } else if (isTp) {
              simExitPrice = entryPrice + Number(whatIfSettings.fixedTp);
              triggered = true; break;
            }
          } else if (t.position === 'Short') {
            const isTp = low <= entryPrice - Number(whatIfSettings.fixedTp);
            const isSl = high >= entryPrice + Number(whatIfSettings.fixedSl);
            if (isTp && isSl) {
              simExitPrice = entryPrice + Number(whatIfSettings.fixedSl);
              triggered = true; break;
            } else if (isSl) {
              simExitPrice = entryPrice + Number(whatIfSettings.fixedSl);
              triggered = true; break;
            } else if (isTp) {
              simExitPrice = entryPrice - Number(whatIfSettings.fixedTp);
              triggered = true; break;
            }
          }
        } else if (whatIfSettings.pattern === 'trailing') {
          if (t.position === 'Long') {
            if (high > maxProfitPrice) maxProfitPrice = high;
            const currentMaxProfit = maxProfitPrice - entryPrice;
            if (!trailingActive && currentMaxProfit >= Number(whatIfSettings.trailAct)) {
              trailingActive = true;
            }
            if (trailingActive) {
              const stopPrice = maxProfitPrice - Number(whatIfSettings.trailRev);
              if (low <= stopPrice) {
                simExitPrice = stopPrice;
                if (stopPrice < minLow) minLow = stopPrice; // adjust minLow if needed
                triggered = true; break;
              }
            }
          } else if (t.position === 'Short') {
            if (low < maxProfitPrice) maxProfitPrice = low;
            const currentMaxProfit = entryPrice - maxProfitPrice;
            if (!trailingActive && currentMaxProfit >= Number(whatIfSettings.trailAct)) {
              trailingActive = true;
            }
            if (trailingActive) {
              const stopPrice = maxProfitPrice + Number(whatIfSettings.trailRev);
              if (high >= stopPrice) {
                simExitPrice = stopPrice;
                if (stopPrice > maxHigh) maxHigh = stopPrice;
                triggered = true; break;
              }
            }
          }
        } else if (whatIfSettings.pattern === 'breakeven') {
          if (t.position === 'Long') {
            if (!beActive && high >= entryPrice + Number(whatIfSettings.beAct)) {
              beActive = true;
            }
            if (beActive) {
              const stopPrice = entryPrice + Number(whatIfSettings.beMoveTo);
              if (low <= stopPrice) {
                simExitPrice = stopPrice;
                if (stopPrice < minLow) minLow = stopPrice;
                triggered = true; break;
              }
            }
          } else if (t.position === 'Short') {
            if (!beActive && low <= entryPrice - Number(whatIfSettings.beAct)) {
              beActive = true;
            }
            if (beActive) {
              const stopPrice = entryPrice - Number(whatIfSettings.beMoveTo);
              if (high >= stopPrice) {
                simExitPrice = stopPrice;
                if (stopPrice > maxHigh) maxHigh = stopPrice;
                triggered = true; break;
              }
            }
          }
        }
      }

      // If not triggered, need to include the exitIndex Open price in the excursion if it exceeds
      if (!triggered && startIndex < exitIndex) {
         if (simExitPrice > maxHigh) maxHigh = simExitPrice;
         if (simExitPrice < minLow) minLow = simExitPrice;
      } else if (startIndex === exitIndex) {
         maxHigh = simExitPrice;
         minLow = simExitPrice;
      }

      let mfe = 0;
      let mae = 0;
      if (t.position === 'Long') {
        mfe = maxHigh - entryPrice;
        mae = minLow - entryPrice;
        if (triggered) {
          if (whatIfSettings.pattern === 'fixed') {
             if (simExitPrice < entryPrice) {
               mae = simExitPrice - entryPrice; // SL hit
             } else {
               mfe = simExitPrice - entryPrice; // TP hit
             }
          } else if (whatIfSettings.pattern === 'trailing') {
             mfe = maxProfitPrice - entryPrice;
             mae = Math.max(mae, simExitPrice - entryPrice);
          } else if (whatIfSettings.pattern === 'breakeven') {
             mae = Math.max(mae, simExitPrice - entryPrice);
          }
        }
      } else if (t.position === 'Short') {
        mfe = entryPrice - minLow;
        mae = entryPrice - maxHigh;
        if (triggered) {
          if (whatIfSettings.pattern === 'fixed') {
             if (simExitPrice > entryPrice) {
               mae = entryPrice - simExitPrice; // SL hit
             } else {
               mfe = entryPrice - simExitPrice; // TP hit
             }
          } else if (whatIfSettings.pattern === 'trailing') {
             mfe = entryPrice - maxProfitPrice;
             mae = Math.max(mae, entryPrice - simExitPrice);
          } else if (whatIfSettings.pattern === 'breakeven') {
             mae = Math.max(mae, entryPrice - simExitPrice);
          }
        }
      }
      
      sumMfe += mfe;
      sumMae += mae;

      // Calculate PnL
      const pnl = t.position === 'Long' ? simExitPrice - entryPrice : entryPrice - simExitPrice;
      validTrades++;
      pnlArray.push(pnl);

      scatterData.push({
        name: t.entryDate || t.date,
        mae: mae,
        mfe: mfe,
        pnl: pnl,
        position: t.position
      });

      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else if (pnl < 0) {
        losses++;
        grossLoss += Math.abs(pnl);
      }

      currentEquity += pnl;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = peakEquity - currentEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      cumulativePnlData.push({
        name: t.entryDate || t.date,
        whatIfEquity: currentEquity,
        whatIfPnl: pnl
      });
    });

    const avgPnl = validTrades === 0 ? 0 : (grossProfit - grossLoss) / validTrades;

    const variance = pnlArray.reduce((acc, p) => acc + Math.pow(p - avgPnl, 2), 0) / (validTrades || 1);
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : avgPnl / stdDev;

    return {
      totalTrades: validTrades,
      winRate: validTrades ? (wins / validTrades) * 100 : 0,
      avgPnl,
      avgProfit: wins > 0 ? grossProfit / wins : 0,
      avgLoss: losses > 0 ? grossLoss / losses : 0,
      avgMfe: validTrades ? sumMfe / validTrades : 0,
      avgMae: validTrades ? sumMae / validTrades : 0,
      sharpeRatio,
      profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
      maxDrawdown,
      cumulativePnlData,
      scatterData
    };
  }, [filteredTrades, csvData, whatIfSettings]);

  return {
    whatIfSettings,
    setWhatIfSettings,
    whatIfStats
  };
}
