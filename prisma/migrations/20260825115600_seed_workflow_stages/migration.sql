-- Seed workflow stages for existing tenders
INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Opportunity' as stage_name,
    1 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Opportunity'
);

INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Qualification' as stage_name,
    2 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Qualification'
);

INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Bid/No-Bid' as stage_name,
    3 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Bid/No-Bid'
);

INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Preparation' as stage_name,
    4 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Preparation'
);

INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Approval' as stage_name,
    5 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Approval'
);

INSERT INTO tender_workflow_stages (public_id, tender_id, stage_name, stage_order, status, created_at, updated_at)
SELECT 
    UUID() as public_id,
    t.id as tender_id,
    'Submission' as stage_name,
    6 as stage_order,
    'Pending' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenders t
WHERE NOT EXISTS (
    SELECT 1 FROM tender_workflow_stages tws 
    WHERE tws.tender_id = t.id AND tws.stage_name = 'Submission'
);
