import assert from 'node:assert/strict';
import test from 'node:test';
import { generateNoteIntelligence } from './aiService.js';

test('local AI fallback returns summary, action items, and suggested title', async () => {
  const { provider, output } = await generateNoteIntelligence({
    title: 'Sprint Planning',
    type: 'meeting',
    content: 'Weekly project planning discussion. Prepare UI mockups. Review API structure.'
  });

  assert.equal(provider, 'local-fallback');
  assert.match(output.summary, /Weekly project planning/);
  assert.ok(output.action_items.length >= 1);
  assert.equal(output.suggested_title, 'Sprint Planning');
});
