import { NextRequest, NextResponse } from 'next/server';
import { addPainPoint, listPainPoints, updatePainPoint, deletePainPoint } from '@/lib/db';
import type { PainPoint, PainSeverity } from '@/lib/types';

// GET /api/research - list all pain points
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PainPoint['status'] | null;
    const severity = searchParams.get('severity') as PainSeverity | null;
    let items = listPainPoints();
    if (status) items = items.filter(p => p.status === status);
    if (severity) items = items.filter(p => p.severity === severity);
    return NextResponse.json({ success: true, data: items, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/research - bulk import pain points from last30days research
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: Array<{
      title: string; description: string; source: string; source_url: string;
      engagement: { upvotes?: number; comments?: number; score?: number };
      tags: string[]; severity?: PainSeverity;
    }>};

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'items array required', timestamp: Date.now() }, { status: 400 });
    }

    const created = items.map(item => {
      const severity = item.severity || inferSeverity(item.engagement);
      return addPainPoint({
        title: item.title,
        description: item.description,
        severity,
        source: item.source,
        source_url: item.source_url,
        engagement: item.engagement,
        tags: item.tags,
        status: 'discovered',
      });
    });

    return NextResponse.json({ success: true, data: created, timestamp: Date.now() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}

// PATCH /api/research/:id - update a pain point
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required', timestamp: Date.now() }, { status: 400 });
    const body = await request.json();
    const updated = updatePainPoint(id, body);
    if (!updated) return NextResponse.json({ success: false, error: 'not found', timestamp: Date.now() }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}

// DELETE /api/research/:id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required', timestamp: Date.now() }, { status: 400 });
    const ok = deletePainPoint(id);
    if (!ok) return NextResponse.json({ success: false, error: 'not found', timestamp: Date.now() }, { status: 404 });
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// Infer severity from engagement signals
function inferSeverity(eng: { upvotes?: number; comments?: number; score?: number }): PainSeverity {
  const comments = eng.comments || 0;
  if (comments >= 20) return 'critical';
  if (comments >= 10) return 'high';
  if (comments >= 5) return 'medium';
  return 'low';
}
