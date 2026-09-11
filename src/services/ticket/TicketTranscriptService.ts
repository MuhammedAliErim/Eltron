import type { Message, Embed, Attachment } from 'discord.js';
import { getSupabaseAdmin } from '../../database/connection';
import { logger } from '../../utils/logger';

interface TranscriptMessage {
  author: string;
  authorAvatar: string;
  authorColor: string;
  timestamp: string;
  content: string;
  embeds: Embed[];
  attachments: Attachment[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEmbed(embed: Embed): string {
  let html = '<div class="embed">';

  if (embed.title) {
    html += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
  }
  if (embed.description) {
    html += `<div class="embed-description">${escapeHtml(embed.description)}</div>`;
  }
  if (embed.fields && embed.fields.length > 0) {
    html += '<div class="embed-fields">';
    for (const field of embed.fields) {
      html += `<div class="embed-field"><div class="embed-field-name">${escapeHtml(field.name)}</div><div class="embed-field-value">${escapeHtml(field.value)}</div></div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function formatAttachment(attachment: Attachment): string {
  const isImage = attachment.contentType?.startsWith('image/') ?? false;
  if (isImage) {
    return `<div class="attachment"><a href="${escapeHtml(attachment.url)}" target="_blank"><img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.name)}" /></a><div class="attachment-name">${escapeHtml(attachment.name)} (${(attachment.size / 1024).toFixed(1)} KB)</div></div>`;
  }
  return `<div class="attachment"><a href="${escapeHtml(attachment.url)}" target="_blank">${escapeHtml(attachment.name)}</a><span class="attachment-size">(${(attachment.size / 1024).toFixed(1)} KB)</span></div>`;
}

function formatContent(content: string): string {
  let formatted = escapeHtml(content);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

export function generateTranscript(channelName: string, messages: TranscriptMessage[]): string {
  const messageHtml = messages.map((msg) => {
    let body = '';

    if (msg.content) {
      body += `<div class="message-content">${formatContent(msg.content)}</div>`;
    }

    for (const embed of msg.embeds) {
      body += formatEmbed(embed);
    }

    for (const attachment of msg.attachments) {
      body += formatAttachment(attachment);
    }

    if (!body) {
      body = '<div class="message-content message-empty">No content</div>';
    }

    return `<div class="message">
      <div class="message-avatar" style="background-color: ${msg.authorColor}">
        <img src="${escapeHtml(msg.authorAvatar)}" alt="" />
      </div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-author" style="color: ${msg.authorColor}">${escapeHtml(msg.author)}</span>
          <span class="message-timestamp">${escapeHtml(msg.timestamp)}</span>
        </div>
        ${body}
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript - ${escapeHtml(channelName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #313338; color: #dbdee1; font-size: 15px; line-height: 1.375; }
  .header { background: #1e1f22; padding: 16px 20px; border-bottom: 1px solid #3f4147; }
  .header h1 { font-size: 16px; font-weight: 600; color: #f2f3f5; }
  .header p { font-size: 12px; color: #b5bac1; margin-top: 4px; }
  .messages { padding: 16px 0; }
  .message { display: flex; padding: 2px 48px 2px 72px; position: relative; min-height: 1.375rem; }
  .message:hover { background: #2e3035; }
  .message-avatar { position: absolute; left: 16px; top: 4px; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; }
  .message-avatar img { width: 100%; height: 100%; }
  .message-body { flex: 1; min-width: 0; }
  .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
  .message-author { font-size: 15px; font-weight: 500; cursor: pointer; }
  .message-author:hover { text-decoration: underline; }
  .message-timestamp { font-size: 12px; color: #949ba4; }
  .message-content { word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; }
  .message-content code { background: #2b2d31; padding: 0.2em 0.4em; border-radius: 3px; font-size: 13.6px; font-family: 'Consolas', 'Courier New', monospace; }
  .message-empty { color: #949ba4; font-style: italic; }
  .embed { margin-top: 4px; max-width: 520px; border-left: 4px solid #5865f2; background: #2b2d31; border-radius: 4px; padding: 12px 16px; }
  .embed-title { font-size: 14px; font-weight: 600; color: #f2f3f5; margin-bottom: 4px; }
  .embed-description { font-size: 14px; color: #dbdee1; }
  .embed-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .embed-field { flex: 1; min-width: 100px; }
  .embed-field-name { font-size: 13px; font-weight: 600; color: #f2f3f5; margin-bottom: 2px; }
  .embed-field-value { font-size: 13px; color: #dbdee1; }
  .attachment { margin-top: 4px; }
  .attachment img { max-width: 400px; max-height: 300px; border-radius: 8px; display: block; margin-top: 4px; }
  .attachment-name { font-size: 13px; color: #00a8fc; }
  .attachment-size { font-size: 12px; color: #949ba4; margin-left: 4px; }
  a { color: #00a8fc; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="header">
  <h1>${escapeHtml(channelName)}</h1>
  <p>Transcript of ${messages.length} messages</p>
</div>
<div class="messages">
${messageHtml}
</div>
</body>
</html>`;
}

export async function saveTranscript(ticketId: number, html: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('tickets')
      .update({ transcript: html })
      .eq('id', ticketId);

    if (error) {
      logger.error({ error, ticketId }, 'Failed to save ticket transcript');
      throw error;
    }
  } catch (error) {
    logger.error({ error, ticketId }, 'Error saving ticket transcript');
    throw error;
  }
}
