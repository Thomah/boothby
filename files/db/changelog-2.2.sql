--liquibase formatted sql

--changeset boothby:create-table-experience
CREATE TABLE IF NOT EXISTS experience (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    obtained_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    slack_id CHARACTER VARYING(255),
    reason CHARACTER VARYING(255),
    experience BIGINT NOT NULL
);
--rollback drop table experience;

--changeset boothby:update-table-slack_teams-add-experience
ALTER TABLE ONLY slack_teams
    ADD level BIGINT DEFAULT 1,
    ADD experience BIGINT DEFAULT 0;
--rollback alter table slack_teams drop column experience;
--rollback alter table slack_teams drop column level;

--changeset boothby:update-table-slack_users-add-experience
ALTER TABLE ONLY slack_users
    ADD experience BIGINT DEFAULT 0;
--rollback alter table slack_users drop column experience;
