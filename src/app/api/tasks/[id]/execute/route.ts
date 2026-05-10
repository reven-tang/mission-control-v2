import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/db';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// POST /api/tasks/[id]/execute
// Full workflow: backlog→todo→in_progress→review→done
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = getTask(id);
    if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });

    const tags = task.tags || [];
    let result = '';
    let didWork = false;
    let newStatus = task.status;

    // Full workflow state machine
    if (task.status === 'backlog') {
      newStatus = 'todo';
      result = 'Moved to TODO queue. Ready for scheduling.';
      didWork = true;
    } else if (task.status === 'todo') {
      newStatus = 'in_progress';
      result = 'Started execution.';
      didWork = true;
    } else if (task.status === 'in_progress') {
      newStatus = 'review';
      result = 'Execution complete. Pending review.';
      didWork = true;
    } else if (task.status === 'review') {
      // Auto-validate: check if task has tests or description
      const hasTests = task.tags?.includes('tested') || (task.description && task.description.length > 50);
      if (hasTests) {
        newStatus = 'done';
        result = 'Auto-validation passed. Task completed!';
        didWork = true;
      } else {
        result = 'Validation pending. Please add tests or description, then Execute again.';
        newStatus = 'review';
      }
    } else if (task.status === 'done') {
      result = 'Task already completed. No action needed.';
    }

    // Tag-based executors (run during in_progress phase)
    if (task.status === 'in_progress' || newStatus === 'in_progress') {
      if (tags.includes('autonomous')) {
        try {
          const mdPath = join(process.cwd(), 'AUTONOMOUS.md');
          if (existsSync(mdPath)) {
            const content = readFileSync(mdPath, 'utf-8');
            const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
              const blocks = fmMatch[1].split(/\n(?=  - id:)/);
              let created = 0;
              for (const b of blocks) {
                const titleMatch = b.match(/title:\s*"?([^"\n]+)"?/);
                if (!titleMatch) continue;
                const existing = (await import('@/lib/db')).listTasks().find((t: any) =>
                  t.title.includes(titleMatch[1].trim()) && t.created_at > Date.now() - 86400000
                );
                if (existing) continue;
                const { createTask } = await import('@/lib/db');
                createTask({ title: titleMatch[1].trim(), priority: 2, tags: ['auto-generated'], source: 'autonomous' });
                created++;
              }
              if (created > 0) {
                result += ` Autonomous executor: ${created} task(s) generated.`;
                didWork = true;
              }
            }
          }
        } catch (e: any) { result += ` Autonomous error: ${e.message}`; }
      } 
      else if (tags.includes('mvp')) {
        try {
          const { createTask: ct } = await import('@/lib/db');
          const mvp = ct({ title: `[MVP] ${task.title}`, description: `MVP for: ${task.description || task.title}`, priority: 3, source: 'autonomous', tags: ['mvp', ...(task.tags || [])] });
          result += ` MVP task created: ${mvp.id}.`;
          didWork = true;
        } catch (e: any) { result += ` MVP error: ${e.message}`; }
      }
    }

    if (didWork && newStatus !== task.status) {
      updateTask(id, { status: newStatus, updated_at: Date.now() });
    }
    
    const updated = getTask(id);
    return NextResponse.json({ success: true, result, task: updated, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}
