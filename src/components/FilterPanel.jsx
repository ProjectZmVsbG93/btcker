import React from 'react';

export function FilterPanel({ filters, setFilters }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="card-feature-emphasized mb-xl">
      <div className="eyebrow-uppercase">Filters</div>
      
      <div className="grid grid-cols-5 mt-xl">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Strategy</label>
          <select 
            className="select-input"
            value={filters.strategy} 
            onChange={(e) => setFilters(prev => ({ ...prev, strategy: e.target.value }))}
          >
            <option value="all">All Strategies</option>
            <option value="futures">Pos by Futures</option>
            <option value="opTotal">Pos by OP Total</option>
            <option value="opIndiv">Pos by OP Indiv</option>
            <option value="futAndOpTotal">Pos by Fut & OP Match</option>
            <option value="Manual">Manual</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Match Type</label>
          <select 
            className="select-input"
            value={filters.matchType} 
            onChange={(e) => setFilters(prev => ({ ...prev, matchType: e.target.value }))}
          >
            <option value="any">Standard Combination (AND)</option>
            <option value="allMatchPlus">All Match (+)</option>
            <option value="allMatchMinus">All Match (-)</option>
            <option value="futAndOptTotal">Futures & OP Total Match</option>
            <option value="futuresOnly">Futures Only</option>
            <option value="opTotalOnly">OP Total Only</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Futures Supply</label>
          <select name="futures" value={filters.futures} onChange={handleChange} className="select-input" disabled={filters.matchType.startsWith('allMatch')}>
            <option value="all">All</option>
            <option value="+">Plus (+)</option>
            <option value="-">Minus (-)</option>
            <option value="NA">NA</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">OP Total Supply</label>
          <select name="optionsTotal" value={filters.optionsTotal} onChange={handleChange} className="select-input" disabled={filters.matchType.startsWith('allMatch')}>
            <option value="all">All</option>
            <option value="+">Plus (+)</option>
            <option value="-">Minus (-)</option>
            <option value="NA">NA</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">OP Individual Supply</label>
          <select name="optionsIndividual" value={filters.optionsIndividual} onChange={handleChange} className="select-input" disabled={filters.matchType !== 'any'}>
            <option value="all">All</option>
            <option value="+">Plus (+)</option>
            <option value="-">Minus (-)</option>
            <option value="NA">NA</option>
          </select>
        </div>
      </div>
    </div>
  );
}
