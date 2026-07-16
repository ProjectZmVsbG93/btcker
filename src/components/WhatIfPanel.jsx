import React from 'react';

export function WhatIfPanel({ settings, setSettings, csvData }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const isDataLoaded = csvData && csvData.length > 0;

  return (
    <div className="card-feature mb-xl">
      <div className="flex justify-between items-center mb-xl">
        <div className="eyebrow-uppercase mb-0" style={{ color: '#00bfff' }}>What-If Simulation</div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          {!isDataLoaded && (
            <span className="body-sm text-danger" style={{ marginRight: '16px' }}>※ 価格データ (CSV) が未読み込みです</span>
          )}
          <label style={{ fontSize: '14px', cursor: isDataLoaded ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', opacity: isDataLoaded ? 1 : 0.5 }}>
            <input type="checkbox" name="active" checked={settings.active} onChange={handleChange} disabled={!isDataLoaded} />
            Enable Simulation
          </label>
        </div>
      </div>

      <div className="grid grid-cols-4" style={{ opacity: settings.active ? 1 : 0.5, pointerEvents: settings.active ? 'auto' : 'none' }}>
        <div className="form-group">
          <label className="form-label">Simulation Pattern</label>
          <select name="pattern" value={settings.pattern} onChange={handleChange} className="select-input">
            <option value="fixed">Fixed TP / SL</option>
            <option value="trailing">Trailing Stop</option>
            <option value="breakeven">Break-Even Stop</option>
          </select>
        </div>

        {settings.pattern === 'fixed' && (
          <>
            <div className="form-group">
              <label className="form-label">Take Profit (TP)</label>
              <select name="fixedTp" value={settings.fixedTp} onChange={handleChange} className="select-input">
                <option value="300">300</option>
                <option value="500">500</option>
                <option value="700">700</option>
                <option value="1000">1000</option>
                <option value="1500">1500</option>
                <option value="2000">2000</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stop Loss (SL)</label>
              <select name="fixedSl" value={settings.fixedSl} onChange={handleChange} className="select-input">
                <option value="300">300</option>
                <option value="500">500</option>
                <option value="700">700</option>
                <option value="1000">1000</option>
                <option value="1500">1500</option>
              </select>
            </div>
          </>
        )}

        {settings.pattern === 'trailing' && (
          <>
            <div className="form-group">
              <label className="form-label">Activation (発動)</label>
              <select name="trailAct" value={settings.trailAct} onChange={handleChange} className="select-input">
                <option value="500">+500</option>
                <option value="1000">+1000</option>
                <option value="1500">+1500</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reversal (逆行幅)</label>
              <select name="trailRev" value={settings.trailRev} onChange={handleChange} className="select-input">
                <option value="300">300</option>
                <option value="500">500</option>
                <option value="700">700</option>
                <option value="1000">1000</option>
              </select>
            </div>
          </>
        )}

        {settings.pattern === 'breakeven' && (
          <>
            <div className="form-group">
              <label className="form-label">Activation (到達)</label>
              <select name="beAct" value={settings.beAct} onChange={handleChange} className="select-input">
                <option value="500">+500</option>
                <option value="800">+800</option>
                <option value="1000">+1000</option>
                <option value="1500">+1500</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Move To (建値+X)</label>
              <select name="beMoveTo" value={settings.beMoveTo} onChange={handleChange} className="select-input">
                <option value="0">±0 (建値)</option>
                <option value="100">+100</option>
                <option value="200">+200</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
