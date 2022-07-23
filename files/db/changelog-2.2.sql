--liquibase formatted sql

--changeset boothby:update-table-slack_teams-add-experience
ALTER TABLE ONLY slack_teams
    ADD level BIGINT DEFAULT 1,
    ADD experience_required_to_next_level BIGINT DEFAULT 1000,
    ADD experience BIGINT DEFAULT 0;
--rollback alter table slack_teams drop column experience;
--rollback alter table slack_teams drop column experience_required_to_next_level;
--rollback alter table slack_teams drop column level;

--changeset boothby:update-table-slack_users-add-experience
ALTER TABLE ONLY slack_users
    ADD experience BIGINT DEFAULT 0;
--rollback alter table slack_users drop column experience;

--changeset boothby:create-table-experiences
CREATE TABLE IF NOT EXISTS experiences (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    obtained_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    slack_id CHARACTER VARYING(255),
    slack_team_id BIGINT,
    reason CHARACTER VARYING(255),
    experience BIGINT NOT NULL
);
--rollback drop table experiences;

--changeset boothby:add-fk-experiences
ALTER TABLE ONLY experiences
    ADD CONSTRAINT fk_slack_team FOREIGN KEY (slack_team_id) REFERENCES slack_teams(id) ON DELETE CASCADE;
--rollback alter table experiences drop constraint fk_slack_team;

--changeset boothby:add-function-grant_xp
CREATE OR REPLACE FUNCTION grant_xp(
        IN _slack_id VARCHAR, 
        IN _reason VARCHAR,
        IN _experience BIGINT)
    RETURNS BOOLEAN
	LANGUAGE plpgsql
    AS '
        DECLARE
            _slack_team_id BIGINT;
        BEGIN

            -- Update Slack User experience
            update slack_users set experience = experience + _experience where slack_id = _slack_id;

            -- Update Slack Team experience
            select slack_team_id into _slack_team_id from slack_users where slack_id = _slack_id;
            update slack_teams set experience = experience + _experience where id = _slack_team_id;

            -- Insert in experience history
            insert into experiences(slack_id, slack_team_id, reason, experience) values (_slack_id, _slack_team_id, _reason, _experience);

            return true;
        END;
';
--rollback drop function if exists grant_xp;

--changeset boothby:add-function-remove_xp
CREATE OR REPLACE FUNCTION remove_xp(
        IN _id BIGINT)
    RETURNS BOOLEAN
	LANGUAGE plpgsql
    AS '
        DECLARE
            _experience experiences%rowtype;
        BEGIN

            -- Get experience infos
            select * into _experience from experiences where id = _id;

            -- Update Slack User experience
            update slack_users set experience = experience - _experience.experience where slack_id = _experience.slack_id;

            -- Update Slack Team experience
            update slack_teams set experience = experience - _experience.experience where id = _experience.slack_team_id;

            -- Delete in experience history
            delete from experiences where id = _id;

            return true;
        END;
';
--rollback drop function if exists remove_xp;
