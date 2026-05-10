import Link from 'next/link';
import { Suspense } from 'react';
import { getTaskService } from '@/lib/services/task';
import { TaskDetailPanel } from '@/lib/components/TaskDetailPanel';
import { WorkflowDiagram } from '@/lib/components/WorkflowDiagram';
import { KanbanClient } from './KanbanClient';
import type { TaskStatus, Task } from '@/lib/types';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: 'BACKLOG' },
  { status: 'todo', label: 'TODO' },
  { status: 'in_progress', label: 'IN PROGRESS' },
  { status: 'review', label: 'REVIEW' },
  { status: 'done', label: 'DONE' },
];

export default async function KanbanPage() {
  const kanban = await getTaskService().getKanban();
  const allTasks = Object.values(kanban).flat();
  
  return (
    <div className="page">
      <WorkflowDiagram />
      <div className="page-header">
        <h1 className="page-title">Kanban</h1>
        <span className="badge badge-gray">{allTasks.length} tasks</span>
      </div>

      <KanbanClient columns={COLUMNS} kanban={kanban} allTasks={allTasks} />

      <Suspense fallback={null}>
        <TaskDetailPanel allTasks={allTasks} />
      </Suspense>
    </div>
  );
}
