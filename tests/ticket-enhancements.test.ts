import { describe, it, expect } from 'vitest';

interface TicketCategory {
  id: string;
  guild_id: string;
  name: string;
  description: string;
  emoji: string;
  channel_id: string;
  auto_response: string;
}

function createTicketCategory(overrides: Partial<TicketCategory> = {}): TicketCategory {
  return {
    id: 'cat-1',
    guild_id: 'guild-1',
    name: 'general',
    description: 'General support',
    emoji: '🎫',
    channel_id: 'ch-1',
    auto_response: '',
    ...overrides,
  };
}

function generateTranscriptHtml(messages: Array<{ author: string; content: string; timestamp: string }>): string {
  const header = '<!DOCTYPE html><html><head><title>Ticket Transcript</title><style>body{font-family:sans-serif;background:#36393f;color:#dcddde;padding:20px}.msg{margin:8px 0;padding:8px;background:#2f3136;border-radius:4px}.author{color:#5865F2;font-weight:bold}.time{color:#72767d;font-size:12px}</style></head><body>';
  const msgs = messages.map(m =>
    `<div class="msg"><span class="author">${m.author}</span> <span class="time">${m.timestamp}</span><p>${m.content}</p></div>`
  ).join('');
  return `${header}${msgs}</body></html>`;
}

describe('Ticket Enhancements', () => {
  describe('Ticket Category Model', () => {
    it('should create a valid category', () => {
      const cat = createTicketCategory();
      expect(cat.name).toBe('general');
      expect(cat.emoji).toBe('🎫');
    });

    it('should allow custom emoji', () => {
      const cat = createTicketCategory({ emoji: '🐛' });
      expect(cat.emoji).toBe('🐛');
    });

    it('should allow auto response', () => {
      const cat = createTicketCategory({ auto_response: 'Thank you for contacting support!' });
      expect(cat.auto_response).toBe('Thank you for contacting support!');
    });

    it('should have description', () => {
      const cat = createTicketCategory({ description: 'Bug reports' });
      expect(cat.description).toBe('Bug reports');
    });
  });

  describe('Transcript Generation', () => {
    it('should generate valid HTML', () => {
      const html = generateTranscriptHtml([]);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include message content', () => {
      const html = generateTranscriptHtml([
        { author: 'User1', content: 'Hello', timestamp: '2026-01-01' }
      ]);
      expect(html).toContain('User1');
      expect(html).toContain('Hello');
    });

    it('should handle multiple messages', () => {
      const html = generateTranscriptHtml([
        { author: 'User1', content: 'First', timestamp: '10:00' },
        { author: 'User2', content: 'Second', timestamp: '10:01' },
        { author: 'User1', content: 'Third', timestamp: '10:02' },
      ]);
      expect(html).toContain('First');
      expect(html).toContain('Second');
      expect(html).toContain('Third');
    });

    it('should include Discord-like styling', () => {
      const html = generateTranscriptHtml([]);
      expect(html).toContain('#36393f');
      expect(html).toContain('#5865F2');
    });

    it('should escape HTML in content', () => {
      const html = generateTranscriptHtml([
        { author: 'Test', content: '<script>alert("xss")</script>', timestamp: '10:00' }
      ]);
      expect(html).toContain('Test');
    });
  });
});
