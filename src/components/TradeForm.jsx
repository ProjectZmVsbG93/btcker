import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

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

export function TradeForm({ onAdd, onUpdate, editingTrade, clearEdit, csvData, setCsvData }) {
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: new Date().toISOString().split('T')[0],
    futuresSupply: 'NA',
    optionsTotalSupply: 'NA',
    optionsIndividualSupply: 'NA',
    entryTime: '09:00',
    exitTime: '15:00',
    entryPrice: '',
    exitPrice: '',
    position: 'Long',
    mfe: '',
    mae: '',
    strategy: 'Manual'
  });
  const [importStrategy, setImportStrategy] = useState('futures');

  useEffect(() => {
    if (editingTrade) {
      setFormData({
        entryDate: editingTrade.entryDate || editingTrade.date || '',
        exitDate: editingTrade.exitDate || editingTrade.date || '',
        futuresSupply: editingTrade.futuresSupply || 'NA',
        optionsTotalSupply: editingTrade.optionsTotalSupply || 'NA',
        optionsIndividualSupply: editingTrade.optionsIndividualSupply || 'NA',
        entryTime: editingTrade.entryTime || '09:00',
        exitTime: editingTrade.exitTime || '15:00',
        entryPrice: editingTrade.entryPrice || '',
        exitPrice: editingTrade.exitPrice || '',
        position: editingTrade.position || 'Long',
        mfe: editingTrade.mfe !== undefined ? editingTrade.mfe : '',
        mae: editingTrade.mae !== undefined ? editingTrade.mae : ''
      });
    }
  }, [editingTrade]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
          return header.trim().replace(/^\uFEFF/, '');
        },
        complete: function(results) {
          setCsvData(results.data);
        }
      });
    }
  };

  const getTradingDate = (calDateStr, timeStr) => {
    if (!calDateStr || !timeStr || csvData.length === 0) return normalizeDate(calDateStr);
    const calDate = new Date(calDateStr);
    const timeNum = parseInt(timeStr.replace(':', ''), 10);
    const uniqueDates = [...new Set(csvData.map(r => normalizeDate(r['日付'])))].sort((a, b) => new Date(a) - new Date(b));
    
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

  const handleSignalImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (csvData.length === 0) {
        alert("先に価格データ (Load CSV Data) を読み込んでください！");
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
          return header.trim().replace(/^\uFEFF/, '');
        },
        complete: function(results) {
          const signals = results.data;
          const colKeys = Object.keys(signals[0] || {});
          if (colKeys.length < 6) {
             alert("インポート用のCSVは少なくとも6列(日付,先物,OP全体,OP個別,Entry,Exit)必要です。");
             return;
          }
          
          const colDate = colKeys[0];
          const colFut = colKeys[1];
          const colOpT = colKeys[2];
          const colOpI = colKeys[3];
          const colEntry = colKeys[4];
          const colExit = colKeys[5];

          let importedCount = 0;
          let consumedExits = new Set();

          for (let i = 0; i < signals.length; i++) {
            const row = signals[i];
            const entryTime = normalizeTime(row[colEntry]);
            if (!entryTime) continue;
            
            const entryDateCal = normalizeDate(row[colDate]);
            let exitDateCal = null;
            let exitTime = null;
            
            for (let j = i; j < signals.length; j++) {
               const ex = normalizeTime(signals[j][colExit]);
               if (ex && !consumedExits.has(j)) {
                 exitDateCal = normalizeDate(signals[j][colDate]);
                 exitTime = ex;
                 consumedExits.add(j);
                 break;
               }
            }
            
            if (!exitDateCal || !exitTime) continue; 
            
            const eTradingDate = getTradingDate(entryDateCal, entryTime);
            const xTradingDate = getTradingDate(exitDateCal, exitTime);
            
            const startIndex = csvData.findIndex(r => normalizeDate(r['日付']) === eTradingDate && normalizeTime(r['時間']) === entryTime);
            const exitIndex = csvData.findIndex(r => normalizeDate(r['日付']) === xTradingDate && normalizeTime(r['時間']) === exitTime);
            
            if (startIndex !== -1 && exitIndex !== -1 && startIndex <= exitIndex) {
              const entryPrice = Number(csvData[startIndex]['始値']);
              const exitPrice = Number(csvData[exitIndex]['始値']);
              
              let maxHigh = -Infinity;
              let minLow = Infinity;
              for (let k = startIndex; k < exitIndex; k++) {
                const high = Number(csvData[k]['高値']);
                const low = Number(csvData[k]['安値']);
                if (!isNaN(high) && high > maxHigh) maxHigh = high;
                if (!isNaN(low) && low < minLow) minLow = low;
              }
              
              let position = 'NA';
              if (row['Position'] || row['position']) {
                 position = row['Position'] || row['position'];
              } else {
                 if (importStrategy === 'futures') {
                   if (row[colFut] === '+') position = 'Long';
                   else if (row[colFut] === '-') position = 'Short';
                 } else if (importStrategy === 'opTotal') {
                   if (row[colOpT] === '+') position = 'Long';
                   else if (row[colOpT] === '-') position = 'Short';
                 } else if (importStrategy === 'opIndiv') {
                   if (row[colOpI] === '+') position = 'Long';
                   else if (row[colOpI] === '-') position = 'Short';
                 } else if (importStrategy === 'futAndOpTotal') {
                   if (row[colFut] === '+' && row[colOpT] === '+') position = 'Long';
                   else if (row[colFut] === '-' && row[colOpT] === '-') position = 'Short';
                 }
              }
              
              let mfe = 0;
              let mae = 0;
              if (maxHigh !== -Infinity && minLow !== Infinity && position !== 'NA') {
                if (position === 'Long') {
                  mfe = maxHigh - entryPrice;
                  mae = minLow - entryPrice;
                } else if (position === 'Short') {
                  mfe = entryPrice - minLow;
                  mae = entryPrice - maxHigh;
                }
              }
              
              onAdd({
                date: entryDateCal,
                entryDate: entryDateCal,
                exitDate: exitDateCal,
                entryTime: entryTime,
                exitTime: exitTime,
                futuresSupply: row[colFut] || 'NA',
                optionsTotalSupply: row[colOpT] || 'NA',
                optionsIndividualSupply: row[colOpI] || 'NA',
                position: position,
                entryPrice: entryPrice,
                exitPrice: exitPrice,
                mfe: mfe,
                mae: mae,
                strategy: importStrategy
              });
              importedCount++;
            }
          }
          alert(`${importedCount}件のトレードをインポートし、価格・MFE/MAEの自動計算を完了しました！`);
          e.target.value = ''; // reset input
        }
      });
    }
  };

  useEffect(() => {
    if (csvData.length === 0) return;

    const eTradingDate = getTradingDate(formData.entryDate, formData.entryTime);
    const xTradingDate = getTradingDate(formData.exitDate, formData.exitTime);
    const eTimeStr = normalizeTime(formData.entryTime);
    const xTimeStr = normalizeTime(formData.exitTime);

    const startIndex = csvData.findIndex(row => 
      normalizeDate(row['日付']) === eTradingDate && normalizeTime(row['時間']) === eTimeStr
    );
    const exitIndex = csvData.findIndex(row => 
      normalizeDate(row['日付']) === xTradingDate && normalizeTime(row['時間']) === xTimeStr
    );

    let newEntryPrice = formData.entryPrice;
    let newExitPrice = formData.exitPrice;
    let newMfe = formData.mfe;
    let newMae = formData.mae;

    if (startIndex !== -1) {
      newEntryPrice = Number(csvData[startIndex]['始値']);
    }
    if (exitIndex !== -1) {
      newExitPrice = Number(csvData[exitIndex]['始値']);
    }

    if (startIndex !== -1 && exitIndex !== -1 && startIndex <= exitIndex) {
      if (startIndex < exitIndex) {
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (let i = startIndex; i < exitIndex; i++) {
          const high = Number(csvData[i]['高値']);
          const low = Number(csvData[i]['安値']);
          if (!isNaN(high) && high > maxHigh) maxHigh = high;
          if (!isNaN(low) && low < minLow) minLow = low;
        }
        
        if (maxHigh !== -Infinity && minLow !== Infinity && formData.position !== 'NA') {
          if (formData.position === 'Long') {
            newMfe = maxHigh - newEntryPrice;
            newMae = minLow - newEntryPrice;
          } else if (formData.position === 'Short') {
            newMfe = newEntryPrice - minLow;
            newMae = newEntryPrice - maxHigh;
          }
        }
      } else {
        newMfe = 0;
        newMae = 0;
      }
    }

    setFormData(prev => ({
      ...prev,
      entryPrice: newEntryPrice !== '' ? newEntryPrice : prev.entryPrice,
      exitPrice: newExitPrice !== '' ? newExitPrice : prev.exitPrice,
      mfe: newMfe !== '' ? newMfe : prev.mfe,
      mae: newMae !== '' ? newMae : prev.mae
    }));

  }, [csvData, formData.entryDate, formData.exitDate, formData.entryTime, formData.exitTime, formData.position]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.entryPrice === '' || formData.exitPrice === '') return;
    
    if (editingTrade) {
      onUpdate(editingTrade.id, {
        ...formData,
        date: formData.entryDate
      });
      clearEdit();
    } else {
      onAdd({
        ...formData,
        date: formData.entryDate 
      });
    }
    
    setFormData(prev => ({ ...prev, entryPrice: '', exitPrice: '', mfe: '', mae: '' }));
  };

  const handleCancel = () => {
    clearEdit();
    setFormData(prev => ({ ...prev, entryPrice: '', exitPrice: '', mfe: '', mae: '' }));
  };

  return (
    <div className="card-feature mb-xl">
      <div className="flex justify-between items-center mb-xl flex-col-mobile">
        <div className="eyebrow-uppercase mb-0">{editingTrade ? 'Edit Trade' : 'Record New Trade'}</div>
        <div className="flex flex-col-mobile w-full-mobile" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="flex items-center flex-col-mobile w-full-mobile" style={{ gap: '8px' }}>
            <label className="button-outline-on-dark w-full-mobile" style={{ cursor: 'pointer', fontSize: '13px', padding: '6px 10px', margin: 0, textAlign: 'center' }}>
              Load CSV Data
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <select value={importStrategy} onChange={(e) => setImportStrategy(e.target.value)} className="select-input w-full-mobile" style={{ fontSize: '13px', padding: '6px 24px 6px 10px', height: 'auto', margin: 0 }}>
              <option value="futures">Pos by Futures</option>
              <option value="opTotal">Pos by OP Total</option>
              <option value="opIndiv">Pos by OP Indiv</option>
              <option value="futAndOpTotal">Pos by Fut & OP Match</option>
            </select>
            <label className="button-outline-on-dark w-full-mobile" style={{ cursor: 'pointer', fontSize: '13px', padding: '6px 10px', margin: 0, textAlign: 'center' }}>
              Import Signals
              <input type="file" accept=".csv" onChange={handleSignalImport} style={{ display: 'none' }} />
            </label>
          </div>
          {csvData.length > 0 && <span className="body-sm text-success" style={{ margin: 0 }}>{csvData.length} rows loaded</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-xl">
        <div className="grid grid-cols-4">
          <div className="form-group">
            <label className="form-label">Entry Date</label>
            <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} className="text-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Exit Date</label>
            <input type="date" name="exitDate" value={formData.exitDate} onChange={handleChange} className="text-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Entry Time</label>
            <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} className="text-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Exit Time</label>
            <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange} className="text-input" required />
          </div>

          <div className="form-group">
            <label className="form-label">Futures Supply</label>
            <select name="futuresSupply" value={formData.futuresSupply} onChange={handleChange} className="select-input">
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="NA">NA</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">OP Total Supply</label>
            <select name="optionsTotalSupply" value={formData.optionsTotalSupply} onChange={handleChange} className="select-input">
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="NA">NA</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">OP Individual Supply</label>
            <select name="optionsIndividualSupply" value={formData.optionsIndividualSupply} onChange={handleChange} className="select-input">
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="NA">NA</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Position</label>
            <select name="position" value={formData.position} onChange={handleChange} className="select-input">
              <option value="Long">Long</option>
              <option value="Short">Short</option>
              <option value="NA">NA</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Entry Price</label>
            <input type="number" name="entryPrice" value={formData.entryPrice} onChange={handleChange} className="text-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Exit Price</label>
            <input type="number" name="exitPrice" value={formData.exitPrice} onChange={handleChange} className="text-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">MFE</label>
            <input type="number" name="mfe" value={formData.mfe} onChange={handleChange} className="text-input" />
          </div>
          <div className="form-group">
            <label className="form-label">MAE</label>
            <input type="number" name="mae" value={formData.mae} onChange={handleChange} className="text-input" />
          </div>
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
          {editingTrade && (
            <button type="button" onClick={handleCancel} className="button-outline-on-dark" style={{ padding: '8px 16px' }}>Cancel</button>
          )}
          <button type="submit" className="button-primary">{editingTrade ? 'Update Trade' : 'Add Trade'}</button>
        </div>
      </form>
    </div>
  );
}
