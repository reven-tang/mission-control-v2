/**
 * OpenClaw Capability Domain Mapping
 * 
 * 能力域是 OpenClaw 资源调度的核心概念。
 * 每个能力域对应一个职责范围，智能体通过声明能力域来注册其能力。
 * 任务通过标签关联到能力域，调度器据此匹配智能体。
 */

// 能力域枚举
export type CapabilityDomain = 'research' | 'script' | 'visual' | 'video' | 'publish' | 'design' | 'data' | 'monitoring';

// 能力域 → 任务标签的映射表
export const CAPABILITY_DOMAIN_MAP: Record<CapabilityDomain, string[]> = {
  research:   ['竞品分析', '用户调研', '数据收集', '趋势分析', '市场分析', 'market-research', 'user-research'],
  script:     ['文章写作', '文案优化', '脚本生成', '内容策划', 'copywriting', 'content-plan'],
  visual:     ['封面设计', 'Banner制作', '信息图表', '配图方案', 'graphic-design', 'illustration'],
  video:      ['视频剪辑', '动效制作', '字幕生成', '视频渲染', 'video-edit', 'motion-graphic'],
  publish:    ['多平台发布', '排期管理', '数据追踪', '微信发布', 'social-publish', 'scheduling'],
  design:     ['UI设计', '交互设计', '原型制作', '品牌设计', 'ui-design', 'ux-design'],
  data:       ['数据分析', '报表生成', '洞察提取', '数据可视化', 'data-analysis', 'reporting'],
  monitoring: ['健康检查', '异常检测', '日志分析', '性能监控', 'healthcheck', 'anomaly-detection'],
};

// 反向查找：根据标签获取对应能力域
export function getDomainForTag(tag: string): CapabilityDomain | null {
  for (const [domain, tags] of Object.entries(CAPABILITY_DOMAIN_MAP)) {
    if (tags.includes(tag)) return domain as CapabilityDomain;
  }
  return null;
}

// 根据标签数组获取所有匹配的能力域
export function getDomainsForTags(tags: string[]): CapabilityDomain[] {
  const domains = new Set<CapabilityDomain>();
  tags.forEach(tag => {
    const domain = getDomainForTag(tag);
    if (domain) domains.add(domain);
  });
  return Array.from(domains);
}

// 智能体能力声明接口
export interface AgentCapability {
  agentId: string;
  domains: CapabilityDomain[];      // 所属能力域
  skills: string[];                 // 具体技能标签
  priority: number;                 // 优先级 (0-100)
  maxConcurrent: number;            // 最大并行任务数
  status: 'online' | 'offline' | 'busy';
}

// 任务能力需求接口
export interface TaskCapabilityRequirement {
  taskId: string;
  requiredDomains: CapabilityDomain[];
  requiredTags: string[];
  minPriority?: number;
}