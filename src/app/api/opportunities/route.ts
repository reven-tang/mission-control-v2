import { NextRequest, NextResponse } from 'next/server';
import { addOpportunity, listOpportunities, updateOpportunity, getPainPoint } from '@/lib/db';
import { createTask } from '@/lib/db';
import { CreateOpportunitySchema, UpdateOpportunitySchema } from '@/lib/validation/schemas';

// GET /api/opportunities
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: listOpportunities(), timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/opportunities  —  also handles ?action=build-mvp for MVP task creation
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // ── build-mvp sub-action ──
    if (action === 'build-mvp') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'id required', timestamp: Date.now() }, { status: 400 });
      const opp = (await import('@/lib/db')).getOpportunity(id);
      if (!opp) return NextResponse.json({ success: false, error: 'opportunity not found', timestamp: Date.now() }, { status: 404 });

      const painDetails = opp.pain_point_ids
        .map(pid => getPainPoint(pid))
        .filter(Boolean)
        .map(p => `- ${p!.title}: ${p!.description}`)
        .join('\n');

      const task = createTask({
        title: opp.mvp_task_title,
        description: `${opp.description}\n\nPain points addressed:\n${painDetails}`,
        priority: 3,
        source: 'autonomous',
        tags: ['mvp', 'research', 'pain-point'],
      });
      updateOpportunity(id, { status: 'building' });
      return NextResponse.json({ success: true, data: { task, opportunity: opp }, timestamp: Date.now() }, { status: 201 });
    }

    // ── normal create ──
    const body = await request.json();
    const parsed = CreateOpportunitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input', timestamp: Date.now() }, { status: 400 });
    }
    const { pain_point_ids, title, description, score, mvp_task_title } = parsed.data;

    const opp = addOpportunity({
      pain_point_ids,
      title,
      description: description || '',
      score: score || 50,
      mvp_task_title: mvp_task_title || `Build MVP: ${title}`,
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
    const parsed = UpdateOpportunitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message, timestamp: Date.now() }, { status: 400 });
    }
    const updated = updateOpportunity(id, parsed.data);
    if (!updated) return NextResponse.json({ success: false, error: 'not found', timestamp: Date.now() }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}
