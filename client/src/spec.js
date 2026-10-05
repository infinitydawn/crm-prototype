// Frontend entity registry — the single source of truth for how each record
// type renders as a list and in the detail panel. Mirrors the backend ENTITIES.

export const STATUS_PIPELINE = ['not_started', 'in_progress', 'blocked', 'waiting', 'done', 'canceled'];
export const PRIORITY_PIPELINE = ['low', 'normal', 'high', 'urgent'];
export const STAGE_PIPELINE = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
export const ACT_TYPES = ['call', 'meeting', 'note', 'email'];

export const USERS = []; // populated at runtime from /api/users

export const ENTITIES = {
  tasks: {
    label: 'Tasks',
    singular: 'task',
    titleCol: 'name',
    createLabel: 'Task',
    icon: '☑',
    columns: [
      { key: 'name', label: 'Task', type: 'text', min: 240 },
      { key: 'status', label: 'Status', type: 'status', pipeline: STATUS_PIPELINE, width: 132 },
      { key: 'priority', label: 'Priority', type: 'priority', pipeline: PRIORITY_PIPELINE, width: 112 },
      { key: 'assignee_id', label: 'Assignee', type: 'user', width: 144 },
      { key: 'due_date', label: 'Due date', type: 'date', width: 132 },
      { key: 'project_id', label: 'Project', type: 'ref', refEntity: 'projects', width: 160 },
      { key: 'account_id', label: 'Account', type: 'ref', refEntity: 'accounts', width: 160 },
    ],
    panelFields: ['status', 'priority', 'assignee_id', 'due_date', 'project_id', 'account_id', 'contact_id', 'opportunity_id'],
  },
  projects: {
    label: 'Projects',
    singular: 'project',
    titleCol: 'name',
    createLabel: 'Project',
    icon: '◧',
    columns: [
      { key: 'name', label: 'Project', type: 'text', min: 240 },
      { key: 'status', label: 'Status', type: 'status', pipeline: STATUS_PIPELINE, width: 132 },
      { key: 'owner_id', label: 'Owner', type: 'user', width: 144 },
      { key: 'due_date', label: 'Due date', type: 'date', width: 132 },
      { key: 'description', label: 'Description', type: 'text', min: 200 },
    ],
    panelFields: ['status', 'owner_id', 'due_date'],
  },
  contacts: {
    label: 'Contacts',
    singular: 'contact',
    titleCol: 'name',
    createLabel: 'Contact',
    icon: '◉',
    columns: [
      { key: 'name', label: 'Name', type: 'text', min: 240 },
      { key: 'email', label: 'Email', type: 'text', min: 200 },
      { key: 'phone', label: 'Phone', type: 'text', width: 140 },
      { key: 'account_id', label: 'Account', type: 'ref', refEntity: 'accounts', width: 160 },
      { key: 'status', label: 'Status', type: 'status', pipeline: ['active', 'inactive'], width: 120 },
      { key: 'owner_id', label: 'Owner', type: 'user', width: 144 },
    ],
    panelFields: ['email', 'phone', 'account_id', 'status', 'owner_id'],
  },
  accounts: {
    label: 'Accounts',
    singular: 'account',
    titleCol: 'name',
    createLabel: 'Account',
    icon: '▦',
    columns: [
      { key: 'name', label: 'Account', type: 'text', min: 240 },
      { key: 'status', label: 'Status', type: 'status', pipeline: ['active', 'inactive', 'lead'], width: 120 },
      { key: 'website', label: 'Website', type: 'text', min: 180 },
      { key: 'phone', label: 'Phone', type: 'text', width: 140 },
      { key: 'owner_id', label: 'Owner', type: 'user', width: 144 },
    ],
    panelFields: ['status', 'website', 'phone', 'owner_id'],
  },
  leads: {
    label: 'Leads',
    singular: 'lead',
    titleCol: 'name',
    createLabel: 'Lead',
    icon: '◆',
    columns: [
      { key: 'name', label: 'Name', type: 'text', min: 240 },
      { key: 'email', label: 'Email', type: 'text', min: 200 },
      { key: 'company', label: 'Company', type: 'text', min: 150 },
      { key: 'source', label: 'Source', type: 'text', width: 130 },
      { key: 'status', label: 'Status', type: 'status', pipeline: STAGE_PIPELINE, width: 132 },
      { key: 'owner_id', label: 'Owner', type: 'user', width: 144 },
    ],
    panelFields: ['email', 'phone', 'company', 'source', 'status', 'owner_id'],
  },
  opportunities: {
    label: 'Opportunities',
    singular: 'opportunity',
    titleCol: 'name',
    createLabel: 'Opportunity',
    icon: '❖',
    columns: [
      { key: 'name', label: 'Opportunity', type: 'text', min: 240 },
      { key: 'account_id', label: 'Account', type: 'ref', refEntity: 'accounts', width: 160 },
      { key: 'stage', label: 'Stage', type: 'status', pipeline: STAGE_PIPELINE, width: 132 },
      { key: 'amount', label: 'Amount', type: 'currency', width: 128 },
      { key: 'probability', label: 'Probability', type: 'percent', width: 110 },
      { key: 'close_date', label: 'Close date', type: 'date', width: 132 },
      { key: 'owner_id', label: 'Owner', type: 'user', width: 144 },
    ],
    panelFields: ['account_id', 'contact_id', 'stage', 'amount', 'probability', 'close_date', 'owner_id'],
  },
};

export const NAV = [
  { section: 'Home', key: 'home', icon: '⌂' },
  { section: 'My Work', key: 'mywork', icon: '✓' },
  {
    section: 'Work',
    key: 'work',
    icon: '▤',
    children: [
      { label: 'Projects', entity: 'projects' },
      { label: 'Tasks', entity: 'tasks' },
    ],
  },
  {
    section: 'Sales',
    key: 'sales',
    icon: '◆',
    children: [
      { label: 'Leads', entity: 'leads' },
      { label: 'Contacts', entity: 'contacts' },
      { label: 'Accounts', entity: 'accounts' },
      { label: 'Opportunities', entity: 'opportunities' },
    ],
  },
  { section: 'Dashboards', key: 'dashboards', icon: '▦' },
  { section: 'Calendar', key: 'calendar', icon: '▦', collapsed: true },
  { section: 'Reports', key: 'reports', icon: '▤', collapsed: true },
];

export const STATUS_TONE = {
  not_started: 'neutral', in_progress: 'info', blocked: 'error',
  waiting: 'warning', done: 'success', canceled: 'neutral',
  active: 'success', inactive: 'neutral', lead: 'info',
  new: 'neutral', contacted: 'info', qualified: 'info',
  proposal: 'warning', won: 'success', lost: 'error',
};

export const STATUS_ICON = {
  not_started: '○', in_progress: '◐', blocked: '!', waiting: '◷',
  done: '✓', canceled: '×', active: '●', inactive: '○', lead: '◆',
  new: '○', contacted: '✉', qualified: '◐', proposal: '◷', won: '✓', lost: '×',
};

// Display resolution helpers (use populated USERS + joined *_{entity}_name fields).
export function userName(users, id) {
  const u = users.find((x) => x.id === Number(id));
  return u ? u.name : (id ? `User ${id}` : '');
}
export function parseNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function fmtCurrency(v) {
  const n = parseNumber(v);
  return n === null ? '' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}
export function fmtPercent(v) {
  const n = parseNumber(v);
  return n === null ? '' : n + '%';
}