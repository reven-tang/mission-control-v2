'use client';

import { useEffect, useRef } from 'react';

const STAGES = [
  { id: 'backlog', label: 'BACKLOG', desc: '待办池', color: '#6b7280' },
  { id: 'todo', label: 'TODO', desc: '待开始', color: '#3b82f6' },
  { id: 'in_progress', label: 'IN PROGRESS', desc: '进行中', color: '#f59e0b' },
  { id: 'review', label: 'REVIEW', desc: '待审查', color: '#8b5cf6' },
  { id: 'done', label: 'DONE', desc: '已完成', color: '#10b981' },
];

const TRANSITIONS = [
  { from: 'backlog', to: 'todo', trigger: 'Execute' },
  { from: 'todo', to: 'in_progress', trigger: 'Execute/Cron' },
  { from: 'in_progress', to: 'review', trigger: '完成' },
  { from: 'review', to: 'done', trigger: '验证' },
  { from: 'review', to: 'in_progress', trigger: '返工', dashed: true },
  { from: 'todo', to: 'backlog', trigger: '取消', dashed: true },
];

export function WorkflowDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800, height = 280;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const stageWidth = 110, stageHeight = 55, startY = 70, gap = (width - stageWidth * 5) / 6;

    STAGES.forEach((stage, i) => {
      const x = gap + i * (stageWidth + gap), y = startY;
      ctx.fillStyle = stage.color + '20';
      ctx.strokeStyle = stage.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, stageWidth, stageHeight, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e5e5e5';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(stage.label, x + stageWidth / 2, y + 22);
      ctx.fillStyle = '#a0a0a0';
      ctx.font = '10px system-ui';
      ctx.fillText(stage.desc, x + stageWidth / 2, y + 38);
    });

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.font = '9px system-ui';
    ctx.fillStyle = '#a0a0a0';

    TRANSITIONS.forEach(t => {
      const fromIdx = STAGES.findIndex(s => s.id === t.from);
      const toIdx = STAGES.findIndex(s => s.id === t.to);
      if (fromIdx === -1 || toIdx === -1) return;

      const fromX = gap + fromIdx * (stageWidth + gap) + stageWidth / 2;
      const toX = gap + toIdx * (stageWidth + gap) + stageWidth / 2;
      const y = startY + stageHeight / 2;

      ctx.setLineDash(t.dashed ? [4, 4] : []);
      ctx.beginPath();
      if (toIdx > fromIdx) {
        ctx.moveTo(fromX + 50, y - 12);
        ctx.lineTo(toX - 50, y - 12);
        ctx.lineTo(toX - 55, y - 17);
        ctx.moveTo(toX - 50, y - 12);
        ctx.lineTo(toX - 55, y - 7);
      } else {
        ctx.moveTo(fromX - 50, y + 25);
        ctx.lineTo(toX + 50, y + 25);
        ctx.lineTo(toX + 55, y + 20);
        ctx.moveTo(toX + 50, y + 25);
        ctx.lineTo(toX + 55, y + 30);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (t.trigger) {
        ctx.fillText(t.trigger, (fromX + toX) / 2, toIdx > fromIdx ? y - 22 : y + 42);
      }
    });

    ctx.fillStyle = '#808080';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Solid = forward', 20, height - 35);
    ctx.fillText('Dashed = rollback', 20, height - 20);
  }, []);

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.75rem' }}>
        🔄 Task Workflow Pipeline
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', maxHeight: 280 }} />
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem', textAlign: 'center' }}>
        Click Execute or use status selector to move tasks through the pipeline
      </div>
    </div>
  );
}
