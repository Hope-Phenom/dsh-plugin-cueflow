/**
 * Built-in workflow templates. They are intentionally deterministic and
 * dependency-free: every template validates with the same rules as a user
 * document, and none requires a specific third-party skill except the
 * "Skill review" example (which the UI marks as needing a skill).
 */

import { createEmptyWorkflow } from '../../shared/validation.js'
import { createNode } from '../../shared/node-types.js'

function n(type, id, title, x, y, config = {}) {
  return createNode(type, { id, title, position: { x, y }, config })
}

function e(id, from, fromPort, to, toPort) {
  return { id, from: { node: from, port: fromPort }, to: { node: to, port: toPort } }
}

function workflow(id, name, description, nodes, edges) {
  return createEmptyWorkflow(name, { id, description, nodes, edges, settings: { concurrency: 2 } })
}

function reviewDiff() {
  return workflow('wf_tpl_review_diff', 'Review a diff', 'git diff → review agent → output', [
    n('input', 'task', 'Task', 40, 80, {
      label: 'Task',
      valueType: 'text',
      defaultValue: 'Review the current git diff and list real correctness bugs.',
      required: true,
    }),
    n('shell', 'diff', 'git diff', 300, 60, {
      command: 'git diff --stat && git diff',
      timeoutMs: 120000,
      failOnNonZero: false,
    }),
    n('agent', 'review', 'Review', 560, 60, {
      instructions: 'You are reviewing a code change. Report only real correctness issues with file/line evidence. If there are none, say so plainly.',
      prompt: '',
      parseJson: false,
    }),
    n('output', 'out', 'Review', 820, 80, { name: 'Review', format: 'text' }),
  ], [
    e('e1', 'task', 'value', 'review', 'prompt'),
    e('e2', 'diff', 'text', 'review', 'context'),
    e('e3', 'review', 'text', 'out', 'value'),
  ])
}

function implementTask() {
  return workflow('wf_tpl_implement', 'Implement a task', 'task → plan → implement → output', [
    n('input', 'task', 'Task', 40, 100, {
      label: 'Task',
      valueType: 'text',
      defaultValue: 'Implement the requested change and run the relevant tests.',
      required: true,
    }),
    n('agent', 'plan', 'Plan', 300, 60, {
      instructions: 'Read the repository first. Produce a short implementation plan with files to touch and tests to run. Do not edit files in this step.',
      prompt: '',
    }),
    n('agent', 'implement', 'Implement', 560, 60, {
      instructions: 'Implement the plan. Keep the diff focused, run the relevant tests, and report what changed and what remains.',
      prompt: '',
    }),
    n('output', 'out', 'Result', 820, 100, { name: 'Result', format: 'text' }),
  ], [
    e('e1', 'task', 'value', 'plan', 'prompt'),
    e('e2', 'plan', 'text', 'implement', 'prompt'),
    e('e3', 'implement', 'text', 'out', 'value'),
  ])
}

function research() {
  return workflow('wf_tpl_research', 'Research a question', 'question → agent → markdown output', [
    n('input', 'question', 'Question', 40, 100, {
      label: 'Question',
      valueType: 'text',
      defaultValue: 'Summarize the tradeoffs of the requested design.',
      required: true,
    }),
    n('agent', 'researcher', 'Researcher', 380, 80, {
      instructions: 'Give a concise, sourced answer. Separate facts from assumptions. End with the three most important takeaways.',
      prompt: '',
    }),
    n('output', 'out', 'Answer', 760, 100, { name: 'Answer', format: 'text' }),
  ], [
    e('e1', 'question', 'value', 'researcher', 'prompt'),
    e('e2', 'researcher', 'text', 'out', 'value'),
  ])
}

function skillReview() {
  return workflow('wf_tpl_skill_review', 'Run a Skill', 'task → Skill → output', [
    n('input', 'task', 'Task', 40, 100, {
      label: 'Task',
      valueType: 'text',
      defaultValue: 'Review the current change.',
      required: true,
    }),
    n('skill', 'skill', 'Code review', 380, 80, {
      skill: 'code-review',
      instructions: 'Use the loaded skill exactly as written.',
    }),
    n('output', 'out', 'Result', 760, 100, { name: 'Result', format: 'text' }),
  ], [
    e('e1', 'task', 'value', 'skill', 'input'),
    e('e2', 'skill', 'text', 'out', 'value'),
  ])
}

function repoHealth() {
  return workflow('wf_tpl_repo_health', 'Repository health', 'git status → agent → output', [
    n('shell', 'status', 'git status', 40, 80, {
      command: 'git status --short && git log --oneline -5',
      failOnNonZero: false,
    }),
    n('agent', 'summary', 'Summarize', 380, 60, {
      prompt: 'Summarize the repository state from the context. Mention uncommitted changes, recent commits, and the most likely next action.',
    }),
    n('output', 'out', 'Summary', 760, 80, { name: 'Summary', format: 'text' }),
  ], [
    e('e1', 'status', 'text', 'summary', 'context'),
    e('e2', 'summary', 'text', 'out', 'value'),
  ])
}

function blank() {
  return workflow('wf_tpl_blank', 'Blank workflow', 'Start from an empty canvas.', [], [])
}

const BUILDERS = {
  'review-diff': reviewDiff,
  'implement-task': implementTask,
  research,
  'skill-review': skillReview,
  'repo-health': repoHealth,
  blank,
}

const META = [
  { id: 'review-diff', name: 'Review a diff', description: 'Read the current git diff, review it, collect the result.' },
  { id: 'implement-task', name: 'Implement a task', description: 'Plan first, then implement, then collect the result.' },
  { id: 'research', name: 'Research a question', description: 'One agent, one question, one markdown answer.' },
  { id: 'skill-review', name: 'Run a Skill', description: 'Drive a DSH Skill (including user-only skills) from the canvas.' },
  { id: 'repo-health', name: 'Repository health', description: 'Inspect git status and recent commits, then summarize.' },
  { id: 'blank', name: 'Blank workflow', description: 'Start from an empty canvas.' },
]

/** List template metadata plus a fresh workflow document. */
export function listTemplates() {
  return META.map(meta => ({
    ...meta,
    workflow: BUILDERS[meta.id](),
  }))
}

/** Find one template. */
export function getTemplate(id) {
  return listTemplates().find(template => template.id === id) ?? null
}
