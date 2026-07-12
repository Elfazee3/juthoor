import { request } from '@playwright/test';

/**
 * Local Supabase captures all outbound mail in Inbucket (http://localhost:54324).
 * Hosted Juthoor sends an 8-digit OTP; local templates default to 6 — so we match
 * any 6–8 digit code (mirrors the app's `/^\d{6,8}$/`).
 */
const INBUCKET_URL = 'http://localhost:54324';

interface InbucketMessage {
  ID: string;
  Created: string;
}
interface InbucketMessageDetail {
  Text?: string;
  Body?: { Text?: string };
}

async function latestMessageText(emailAddress: string): Promise<string | null> {
  const mailbox = emailAddress.split('@')[0];
  const ctx = await request.newContext();
  try {
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await ctx
        .get(`${INBUCKET_URL}/api/v1/search?query=${mailbox}&limit=20`)
        .catch(() => null);
      if (!res?.ok()) continue;
      const body = (await res.json().catch(() => null)) as { messages?: InbucketMessage[] } | null;
      const messages = body?.messages ?? [];
      if (!messages.length) continue;
      const latest = [...messages].sort(
        (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime(),
      )[0];
      const detailRes = await ctx.get(`${INBUCKET_URL}/api/v1/message/${latest.ID}`).catch(() => null);
      if (!detailRes?.ok()) continue;
      const detail = (await detailRes.json().catch(() => null)) as InbucketMessageDetail | null;
      const text = detail?.Text ?? detail?.Body?.Text;
      if (text) return text;
    }
    return null;
  } finally {
    await ctx.dispose();
  }
}

/** Poll Inbucket for the newest email to `emailAddress` and return its OTP code. */
export async function getOtpCodeForAddress(emailAddress: string): Promise<string> {
  const text = await latestMessageText(emailAddress);
  if (!text) throw new Error(`No OTP email arrived for ${emailAddress}`);
  const match = text.match(/\b(\d{6,8})\b/);
  if (!match) throw new Error(`Could not find a 6–8 digit OTP code in the email to ${emailAddress}`);
  return match[1];
}
