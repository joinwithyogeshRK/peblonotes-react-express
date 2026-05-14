import { config } from '../config.js';

export async function generateNoteIntelligence(note) {
  if (config.llmApiKey && config.llmApiUrl) {
    try {
      return {
        provider: 'configured-llm',
        output: await callConfiguredProvider(note)
      };
    } catch (error) {
      console.warn(`LLM provider failed, using local fallback: ${error.message}`);
    }
  }

  return {
    provider: 'local-fallback',
    output: localIntelligence(note)
  };
}

async function callConfiguredProvider(note) {
  const response = await fetch(config.llmApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llmApiKey}`
    },
    body: JSON.stringify({
      model: config.llmModel || undefined,
      messages: [
        {
          role: 'system',
          content: 'Return only JSON with summary, action_items, and suggested_title for the note.'
        },
        {
          role: 'user',
          content: `Title: ${note.title}\nType: ${note.type}\nContent:\n${note.content}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || data.output_text || JSON.stringify(data);
  return normalize(JSON.parse(extractJson(text)));
}

function localIntelligence(note) {
  const content = note.content || '';
  const sentences = content.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 2).join(' ') || 'No note content yet. Add details to generate a stronger summary.';
  const actionItems = content
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ''))
    .filter((line) => /^(todo|action|next|follow up|prepare|review|send|create|schedule|draft|call|email)/i.test(line))
    .slice(0, 6);

  return normalize({
    summary,
    action_items: actionItems.length ? actionItems : inferActionItems(content),
    suggested_title: suggestTitle(note)
  });
}

function inferActionItems(content) {
  const inferred = [];
  if (/meeting|sync|discussion/i.test(content)) inferred.push('Share meeting recap with stakeholders');
  if (/design|ui|mockup/i.test(content)) inferred.push('Prepare UI mockups');
  if (/api|backend|database/i.test(content)) inferred.push('Review API and data model');
  if (/launch|deadline|release/i.test(content)) inferred.push('Confirm launch timeline');
  return inferred.length ? inferred : ['Review the note and add the next concrete step'];
}

function suggestTitle(note) {
  if (note.title && note.title !== 'Untitled note') return note.title;
  const heading = note.content?.match(/^#\s+(.+)$/m)?.[1];
  if (heading) return heading.slice(0, 80);
  return note.type === 'meeting' ? 'Meeting Notes' : 'Untitled note';
}

function normalize(output) {
  return {
    summary: String(output.summary || '').trim(),
    action_items: Array.isArray(output.action_items) ? output.action_items.map(String).slice(0, 8) : [],
    suggested_title: String(output.suggested_title || 'Untitled note').trim()
  };
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found.');
  return text.slice(start, end + 1);
}
