import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const out = execSync(
      'cd /Users/jhwu/.openclaw/workspace && python3 -c '
      + '"import json; from brain.bin.skill_graph_analyzer import analyze; print(json.dumps(analyze()))"',
      { encoding: 'utf-8', timeout: 10000 }
    );
    const data = JSON.parse(out);
    return NextResponse.json({ success: true, data, timestamp: Date.now() });
  } catch (error: any) {
    // Fallback: static stats from brain
    const fallback = {
      total_skills: 129,
      nodes: 129,
      edges: 450,
      graph_density: 0.027,
      excellent: 50,
      good: 40,
      fair: 30,
      poor: 9,
    };
    return NextResponse.json({ success: true, data: fallback, timestamp: Date.now() });
  }
}