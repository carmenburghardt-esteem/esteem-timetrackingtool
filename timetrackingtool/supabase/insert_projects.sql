-- ESTEEM — Insert all projects
-- Run this in: https://supabase.com/dashboard/project/opdzwxqofwmbuukncnyy/sql/new
-- Run AFTER the schema.sql migration and after adding the billable column.
--
-- First add the new columns if not already present:
--   alter table public.projects add column if not exists code text;
--   alter table public.projects add column if not exists category text;
--   alter table public.projects add column if not exists requires_approval boolean not null default false;
--   alter table public.projects alter column budget drop not null;

insert into public.projects (code, client_name, name, service_type, category, billable, requires_approval, budget, status, description)
values

-- ─── Directly Billable ────────────────────────────────────────────────────────
('KL-001', 'Genovum',    'Genovum',    'Client Project',   'directly-billable', true,  false, null, 'active',
 'Consulting, training, workshops, client meetings, support, research, project management and client-specific delivery for Genovum.'),

('KL-002', 'Handelsbank', 'Handelsbank', 'Client Project',  'directly-billable', true,  false, null, 'active',
 'Consulting, training, workshops, client meetings, support, research, project management and client-specific delivery for Handelsbank.'),

('KL-003', 'Applause',   'Applause',   'Client Project',   'directly-billable', true,  false, null, 'active',
 'Consulting, training, workshops, client meetings, support, research, project management and client-specific delivery for Applause.'),

('KL-004', 'Esteem',     'Esteem Awareness Trainings', 'Training Delivery', 'directly-billable', true, false, null, 'active',
 'Delivery of accessibility awareness training programmes. Includes preparation, delivery and follow-up.'),

('HR-001', 'Esteem',     'Coaching & People Development', 'Coaching', 'directly-billable', true, false, null, 'active',
 'Coaching sessions organised by Esteem. Personal guidance and mentoring of junior team members.'),

-- ─── Billable upon Prior Approval ─────────────────────────────────────────────
('CX-001', 'Esteem',     'Customer & People Development', 'Strategic Investment', 'billable-approval', true, true, null, 'active',
 'Dashboards, AI solutions, automations, client portals, knowledge bases, process improvements, coaching programs, training materials, wellbeing initiatives and leadership development. Requires prior approval from Carmen before invoicing.'),

-- ─── Strategic Investment ──────────────────────────────────────────────────────
('BD-001', 'Esteem',     'Partner Development',          'Business Development', 'strategic-investment', false, false, null, 'active',
 'Building and maintaining partnerships that support Esteem growth. Partnership building and relationship management.'),

('BD-002', 'Esteem',     'Service Development',          'Business Development', 'strategic-investment', false, false, null, 'active',
 'Innovation of services, new methodologies and frameworks, new programme development. Not invoiced to clients.'),

('BD-003', 'Esteem',     'Community Management',         'Business Development', 'strategic-investment', false, false, null, 'active',
 'Community building and management. Facilitating and growing the Esteem community.'),

('BD-004', 'Esteem',     'Event Organization',           'Business Development', 'strategic-investment', false, false, null, 'active',
 'Planning and organisation of Esteem-hosted events and gatherings.'),

('MKT-001', 'Esteem',    'Esteem Social Media',          'Marketing',            'strategic-investment', false, false, null, 'active',
 'Content creation and management of Esteem social media channels. Thought leadership and brand presence.'),

('MKT-002', 'Esteem',    'Communications',               'Marketing',            'strategic-investment', false, false, null, 'active',
 'External communications, newsletters, PR activities and content creation.'),

('MKT-003', 'Esteem',    'Public Speaking & Presentations', 'Marketing',         'strategic-investment', false, false, null, 'active',
 'Conferences, talks, presentations and thought leadership activities.'),

('HR-001-S', 'Esteem',   'Coaching & People Development (Strategic)', 'HR',      'strategic-investment', false, false, null, 'active',
 'Leadership development, team coaching and professional development programs. Team development and innovation of people programs.'),

-- ─── Overhead ─────────────────────────────────────────────────────────────────
('INT-001', 'Esteem',    'Management & Organization',    'Operations',           'overhead',             false, false, null, 'active',
 'Operational management, internal meetings, organisational activities and management tasks.'),

('INT-002', 'Esteem',    'Administration & Office Management', 'Operations',     'overhead',             false, false, null, 'active',
 'Administration, finance, office management and support activities.'),

('INT-003', 'Esteem',    'Internal IT & Systems',        'Operations',           'overhead',             false, false, null, 'active',
 'Internal systems management, tooling setup, IT support and ESTEEM platform maintenance.'),

-- ─── Personal Development ─────────────────────────────────────────────────────
('INT-004', 'Esteem',    'Learning & Development',       'Personal Development', 'personal-development', false, false, null, 'active',
 'External training programs, certifications, professional courses, self-study and personal knowledge development.'),

-- ─── Social Impact ────────────────────────────────────────────────────────────
('IMP-001', 'Esteem',    'Volunteer Work',               'Social Impact',        'social-impact',        false, false, null, 'active',
 'Voluntary activities that contribute to society. Not commercial activities.'),

('IMP-002', 'Esteem',    'Pro Bono Projects',            'Social Impact',        'social-impact',        false, false, null, 'active',
 'Pro bono client work contributing to social good. Not commercially invoiced.');
