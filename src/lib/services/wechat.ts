// WeChat Official Account Service
import { loadEnv } from '@/lib/utils/env';

const _env = loadEnv();
const APP_ID = process.env.WECHAT_APPID || _env.WECHAT_APPID;
const APP_SECRET = process.env.WECHAT_APPSECRET || _env.WECHAT_APPSECRET;

let _tokenCache: { token: string; expiresAt: number } | null = null;

interface AccessToken {
  access_token: string;
  expires_in: number;
}

interface Article {
  title: string;
  thumb_media_id?: string;
  author?: string;
  digest?: string;
  content: string;
  content_source_url?: string;
  need_open_comment?: number;
}

// 获取 Access Token（带缓存，提前 5 分钟刷新）
export async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 300_000) {
    return _tokenCache.token;
  }

  if (!APP_ID || !APP_SECRET) {
    throw new Error('WECHAT_APPID / WECHAT_APPSECRET not configured');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) }); // 30s timeout
  const data: AccessToken & { errcode?: number; errmsg?: string } = await res.json();

  if (data.errcode) {
    throw new Error(`WeChat auth failed [${data.errcode}]: ${data.errmsg}`);
  }

  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return _tokenCache.token;
}

// 从素材库获取图片列表
export async function listMaterialImages(offset = 0, count = 10): Promise<{ media_id: string; url: string; name: string }[]> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'image', offset, count }),
  });
  const data: { item?: { media_id: string; content: { url: string; name: string } }[]; errcode?: number; errmsg?: string } = await res.json();

  if (data.errcode) {
    throw new Error(`List materials failed [${data.errcode}]: ${data.errmsg}`);
  }

  return (data.item || []).map(item => ({
    media_id: item.media_id,
    url: item.content?.url || '',
    name: item.content?.name || '',
  }));
}

// 自动获取封面 thumb_media_id（从素材库选第一张）
export async function getThumbMediaId(): Promise<string> {
  const images = await listMaterialImages(0, 5);
  if (images.length === 0) {
    throw new Error('素材库没有图片，请先在公众号后台上传封面图');
  }
  return images[0].media_id;
}

// 发布图文到草稿箱（自动获取封面）
export async function publishDraft(articles: Article[]): Promise<{ media_id: string }> {
  const token = await getAccessToken();

  // 自动获取封面 media_id
  let thumbMediaId = articles[0]?.thumb_media_id;
  if (!thumbMediaId) {
    thumbMediaId = await getThumbMediaId();
  }

  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

  const formattedArticles = articles.map(a => ({
    title: a.title,
    content: a.content,
    digest: a.digest || a.content.slice(0, 120).replace(/<[^>]+>/g, ''),
    need_open_comment: a.need_open_comment ?? 0,
    content_source_url: a.content_source_url || '',
    thumb_media_id: thumbMediaId,
    author: a.author || 'Mission Control',
  }));

  const body = { articles: formattedArticles };
  console.log('[WeChat] Publishing draft:', JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: { media_id?: string; errcode?: number; errmsg?: string } = await res.json();
  console.log('[WeChat] Response:', data);

  if (data.errcode) {
    throw new Error(`Publish failed [${data.errcode}]: ${data.errmsg}`);
  }

  return { media_id: data.media_id! };
}

// 发布草稿到公众号（正式发布）
export async function publishArticle(mediaId: string): Promise<{ publish_id: number }> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId }),
  });
  const data: { publish_id?: number; errcode?: number; errmsg?: string } = await res.json();

  if (data.errcode) {
    throw new Error(`Freepublish failed [${data.errcode}]: ${data.errmsg}`);
  }

  return { publish_id: data.publish_id! };
}