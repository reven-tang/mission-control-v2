import { NextRequest, NextResponse } from 'next/server';
import { addOpportunity, listOpportunities, updateOpportunity, getPainPoint } from '@/lib/db';
import { createTask } from '@/lib/db';

// GET /api/opportunities
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: listOpportunities(), timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/opportunities - create opportunity from pain points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pain_point_ids, title, description, score } = body as {
      pain_point_ids: string[]; title: string; description?: string; score?: number;
    };

    if (!pain_point_ids?.length || !title) {
      return NextResponse.json({ success: false, error: 'pain_point_ids and title required', timestamp: Date.now() }, { status: 400 });
    }

    const opp = addOpportunity({
      pain_point_ids,
      title,
      description: description || '',
      score: score || 50,
      mvp_task_title: `Build MVP: ${title}`,
      status: 'idea',
    });

    return NextResponse.json({ success: true, data: opp, timestamp: Date.now() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}

// PATCH /api/opportunities/:id
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required', timestamp: Date.now() }, { status: 400 });
    const body = await request.json();
    const updated = updateOpportunity(id, body);
    if (!updated) return NextResponse.json({ success: false, error: 'not found', timestamp: Date.now() }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}

// POST /api/opportunities/:id/build-mvp - convert opportunity to a task
export async function POST_BUILD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required', timestamp: Date.now() }, { status: 400 });

    const opp = (await import('@/lib/db')).getOpportunity(id);
    if (!opp) return NextResponse.json({ success: false, error: 'opportunity not found', timestamp: Date.now() }, { status: 404 });

    // Collect pain point descriptions for task context
    const painDetails = opp.pain_point_ids
      .map(pid => getPainPoint(pid))
      .filter(Boolean)
      .map(p => `- ${p!.title}: ${p!.description}`)
      .join('\n');

    const task = createTask({
      title: opp.mvp_task_title,
      description: `${opp.description}\n\nPain points addressed:\n${painDetails}`,
      priority: 3, // high
      source: 'autonomous',
      tags: ['mvp', 'research', 'pain-point'],
    });

    // Update opportunity status
    updateOpportunity(id, { status: 'building' });

    return NextResponse.json({ success: true, data: { task, opportunity: opp }, timestamp: Date.now() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}
