-- LifeTrigger Engine - PostgreSQL Schema (SaaS / Multi-Tenant Architecture)
-- Defines the immutable, deterministic, stateless core storage.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. Governance Data (Engine & Rules Versioning)
--------------------------------------------------------------------------------

-- Engine Versions (Defines the core C# application binary version running)
CREATE TABLE engine_versions (
    tenant_id UUID NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, version)
);

-- RuleSets (Defines the quantitative multipliers and guardrails at the time of evaluation)
CREATE TABLE rulesets (
    tenant_id UUID NOT NULL,
    ruleset_version VARCHAR(50) NOT NULL,
    parameters_snapshot JSONB NOT NULL, -- e.g., {"max_income_years": 10, "debt_penalty": 10}
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, ruleset_version)
);

--------------------------------------------------------------------------------
-- 2. Domain Data (Subjects/Users)
--------------------------------------------------------------------------------

-- Subjects (Logical identifier of the insured party, stripping any unnecessary explicit PII outside the domain wrapper)
CREATE TABLE subjects (
    tenant_id UUID NOT NULL,
    subject_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    origin_channel VARCHAR(100), -- App, Web, IntegratedBroker
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, subject_id)
);

--------------------------------------------------------------------------------
-- 3. Execution Data (Calculation Engine)
--------------------------------------------------------------------------------

-- Evaluations (The core deterministic output and snapshot)
CREATE TABLE evaluations (
    evaluation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    engine_version VARCHAR(50) NOT NULL,
    ruleset_version VARCHAR(50) NOT NULL,
    
    -- Immutable boundaries enabling exact reproducibility
    input_snapshot JSONB NOT NULL, -- PII-Masked input received from API
    output_snapshot JSONB NOT NULL, -- Exact calculation result (Gap, Score, RecommendedAction)
    
    -- Cryptographic non-repudiation signature
    audit_hash VARCHAR(256) NOT NULL, 
    
    -- Optional linking to an external event that caused the evaluation
    trigger_origin UUID, 
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, evaluation_id),
    
    CONSTRAINT fk_evaluations_subject FOREIGN KEY (tenant_id, subject_id) 
        REFERENCES subjects (tenant_id, subject_id),
    CONSTRAINT fk_evaluations_engine FOREIGN KEY (tenant_id, engine_version) 
        REFERENCES engine_versions (tenant_id, version),
    CONSTRAINT fk_evaluations_ruleset FOREIGN KEY (tenant_id, ruleset_version) 
        REFERENCES rulesets (tenant_id, ruleset_version)
);

--------------------------------------------------------------------------------
-- 4. Event Streaming Data (Triggers Engine)
--------------------------------------------------------------------------------

-- Triggers (Registers a life event requiring a re-evaluation process)
CREATE TABLE triggers (
    trigger_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    
    trigger_type VARCHAR(50) NOT NULL, -- RENDA_SUBIU, NASCEU_FILHO, etc.
    trigger_payload JSONB NOT NULL, -- Event specific contextual data
    
    -- Links back to the calculation consequence generated
    evaluation_id UUID NOT NULL, 
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, trigger_id),
    
    CONSTRAINT fk_triggers_subject FOREIGN KEY (tenant_id, subject_id) 
        REFERENCES subjects (tenant_id, subject_id)
);

-- We add the circular constraint after creating the triggers table since evaluations maps to it
ALTER TABLE evaluations 
ADD CONSTRAINT fk_evaluations_trigger FOREIGN KEY (tenant_id, trigger_origin) 
REFERENCES triggers (tenant_id, trigger_id);

ALTER TABLE triggers
ADD CONSTRAINT fk_triggers_evaluations FOREIGN KEY (tenant_id, evaluation_id)
REFERENCES evaluations (tenant_id, evaluation_id);


--------------------------------------------------------------------------------
-- 5. Compliance & Explanability (Audit Source)
--------------------------------------------------------------------------------

-- Audit Logs (Heavier text/rules data extracted out of main tables for clean microservice separation)
CREATE TABLE audit_logs (
    audit_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    evaluation_id UUID NOT NULL,
    
    rules_applied JSONB NOT NULL,        -- Array or structured object representing all branches visited
    parameters_used JSONB NOT NULL,      -- Exact constants injected from RuleSets in this specific run
    explainability_text JSONB NOT NULL,  -- Customer-facing array of textual justifications 
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, audit_id),
    
    CONSTRAINT fk_audit_evaluations FOREIGN KEY (tenant_id, evaluation_id) 
        REFERENCES evaluations (tenant_id, evaluation_id)
);

--------------------------------------------------------------------------------
-- Database Indexes for Analytics / Read Optimizations
--------------------------------------------------------------------------------
CREATE INDEX idx_evaluations_subject ON evaluations (tenant_id, subject_id);
CREATE INDEX idx_evaluations_versions ON evaluations (tenant_id, engine_version, ruleset_version);
CREATE INDEX idx_triggers_type ON triggers (tenant_id, trigger_type);
CREATE INDEX idx_audit_evaluation ON audit_logs (tenant_id, evaluation_id);
