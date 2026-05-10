// Stock Image Search & WeChat Upload Service
// 从免费图库搜索图片 + 上传到微信素材库

import fs from 'fs';
import { join } from 'path';
import { getAccessToken } from './wechat';

function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf-8')
      .split('\n').filter(l => l && !l.startsWith('#'))
      .reduce((acc, line) => { const [k, ...v] = line.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {} as Record<string, string>);
  }
  return {};
}

const _env = loadEnv();

// 从免费图库搜索相关图片
// 使用 picsum.photos + 主题关键词映射
const TOPIC_IMAGE_MAP: Record<string, string> = {
  'AI': 'https://picsum.photos/800/400?random=1',
  '人工智能': 'https://picsum.photos/800/400?random=2',
  '科技': 'https://picsum.photos/800/400?random=3',
  '未来': 'https://picsum.photos/800/400?random=4',
  '教育': 'https://picsum.photos/800/400?random=5',
  '职业': 'https://picsum.photos/800/400?random=6',
  '经济': 'https://picsum.photos/800/400?random=7',
  '生活': 'https://picsum.photos/800/400?random=8',
  '健康': 'https://picsum.photos/800/400?random=9',
  'default': 'https://picsum.photos/800/400?random=10',
};

function getImageUrlForTopic(topic: string): string {
  // 根据主题关键词匹配图片 URL
  for (const [keyword, url] of Object.entries(TOPIC_IMAGE_MAP)) {
    if (keyword !== 'default' && topic.toLowerCase().includes(keyword.toLowerCase())) {
      return url;
    }
  }
  return TOPIC_IMAGE_MAP['default'];
}

// 下载图片到临时文件
async function downloadImage(url: string): Promise<Buffer> {
  console.log(`[Image] Downloading: ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// 上传图片到微信素材库（永久素材）
export async function uploadImageToWechat(imageBuffer: Buffer, filename: string = 'cover.jpg'): Promise<{ media_id: string; url: string }> {
  const token = await getAccessToken();
  const uploadUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;

  // 构造 multipart form data
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const header = (
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  ).encode();
  const footer = `\r\n--${boundary}--\r\n`.encode();
  const body = Buffer.concat([header, imageBuffer, footer]);

  console.log(`[Image] Uploading to WeChat: ${imageBuffer.length} bytes`);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: new Uint8Array(body),
  });

  const data = await res.json() as { media_id?: string; url?: string; errcode?: number; errmsg?: string };

  if (data.errcode) {
    throw new Error(`Upload failed [${data.errcode}]: ${data.errmsg}`);
  }

  console.log(`[Image] Uploaded: media_id=${data.media_id?.slice(0, 30)}...`);
  return { media_id: data.media_id!, url: data.url! };
}

// 完整流程：搜索图片 → 下载 → 上传微信 → 返回 media_id
export async function searchAndUploadImage(topic: string): Promise<{ media_id: string; url: string; source_url: string }> {
  const imageUrl = getImageUrlForTopic(topic);
  const imageBuffer = await downloadImage(imageUrl);
  const result = await uploadImageToWechat(imageBuffer, `cover-${Date.now()}.jpg`);
  return { ...result, source_url: imageUrl };
}

// 获取封面图（优先从素材库，否则搜索上传）
export async function getThumbMediaIdForTopic(topic: string): Promise<string> {
  try {
    // 先尝试从素材库获取
    const token = await getAccessToken();
    const materialUrl = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`;
    const res = await fetch(materialUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'image', offset: 0, count: 10 }),
    });
    const data = await res.json() as { item?: { media_id: string }[]; errcode?: number };

    // 检查素材库中是否有适合主题的图片
    if (data.item && data.item.length > 0) {
      // 找到最近上传的（可能是本 pipeline 上传的）
      console.log(`[Image] Found ${data.item.length} images in material library`);
      // 搜索上传新的主题相关图片
    }

    // 搜索并上传新图片
    const result = await searchAndUploadImage(topic);
    return result.media_id;
  } catch (e: any) {
    console.error(`[Image] Failed: ${e.message}`);
    // fallback: 从素材库取第一张
    const { listMaterialImages } = await import('./wechat');
    const images = await listMaterialImages(0, 5);
    if (images.length > 0) return images[0].media_id;
    throw new Error('No cover image available');
  }
}