'use client';

import { useState, useEffect } from 'react';

export default function CostTrackerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cost')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="page-header"><h1>Loading...</h1></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">AI Agent Cost Tracker</h1>
        <span className="badge badge-gray">${data?.total?.toFixed(4) || 0} USD</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        <div className="card">
          <div className="card-head"><span className="card-label">By Agent</span></div>
          {Object.entries(data?.byAgent || {}).map(([agent, cost]: [string, any]) => (
            <div key={agent} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>{agent}</span><span style={{ fontWeight: 600 }}>${Number(cost).toFixed(4)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><span className="card-label">By Model</span></div>
          {Object.entries(data?.byModel || {}).map(([model, cost]: [string, any]) => (
            <div key={model} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>{model}</span><span style={{ fontWeight: 600 }}>${Number(cost).toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
