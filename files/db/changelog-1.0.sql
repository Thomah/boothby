--liquibase formatted sql

--changeset boothby:create-sequence-id_number
CREATE SEQUENCE IF NOT EXISTS id_number
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--rollback drop sequence id_number;

--changeset boothby:create-table-users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    password CHARACTER VARYING(255) NOT NULL,
    username CHARACTER VARYING(255)
);
--rollback drop table users;

--changeset boothby:create-table-slack_teams
CREATE TABLE IF NOT EXISTS slack_teams (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    app_id CHARACTER VARYING(255),
    authed_user_id CHARACTER VARYING(255),
    scope CHARACTER VARYING(255),
    token_type CHARACTER VARYING(255),
    access_token CHARACTER VARYING(255),
    bot_user_id CHARACTER VARYING(255),
    team_id CHARACTER VARYING(255),
    team_name CHARACTER VARYING(255),
    incoming_webhook_channel CHARACTER VARYING(255),
    incoming_webhook_channel_id CHARACTER VARYING(255),
    incoming_webhook_configuration_url CHARACTER VARYING(255),
    incoming_webhook_url CHARACTER VARYING(255),
    bot_id CHARACTER VARYING(255),
    progression BIGINT
);
--rollback drop table slack_teams;

--changeset boothby:create-table-slack_users
CREATE TABLE IF NOT EXISTS slack_users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_by CHARACTER VARYING(255) DEFAULT 'System'::CHARACTER VARYING,
    im_id CHARACTER VARYING(255),
    slack_id CHARACTER VARYING(255),
    slack_team_id BIGINT,
    user_id BIGINT,
    consent BOOLEAN
);
--rollback drop table slack_users;

--changeset lesprojetscagnottes:add-fk-slack_users
ALTER TABLE ONLY slack_users
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_slack_team FOREIGN KEY (slack_team_id) REFERENCES slack_teams(id) ON DELETE CASCADE;
--rollback alter table slack_users drop constraint fk_slack_team;
--rollback alter table slack_users drop constraint fk_user;
