--liquibase formatted sql

--changeset boothby:update-table-slack_teams-add-experience
ALTER TABLE ONLY slack_teams
    ADD level_id BIGINT;
--rollback alter table slack_teams drop column level;

--changeset boothby:update-table-slack_users-add-experience
ALTER TABLE ONLY slack_users
    ADD experience BIGINT DEFAULT 0;
--rollback alter table slack_users drop column experience;

--changeset boothby:create-table-levels
CREATE TABLE IF NOT EXISTS levels (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    slack_team_id BIGINT,
    level BIGINT DEFAULT 1,
    experience BIGINT DEFAULT 0,
    max_experience BIGINT DEFAULT 800
);
--rollback drop table levels;

--changeset boothby:add-fk-levels
ALTER TABLE ONLY levels
    ADD CONSTRAINT fk_slack_team FOREIGN KEY (slack_team_id) REFERENCES slack_teams(id) ON DELETE CASCADE;
--rollback alter table levels drop constraint fk_slack_team;

--changeset boothby:create-data-levels
INSERT INTO levels(slack_team_id) SELECT id FROM slack_teams;
--rollback delete from levels where slack_team_id in (SELECT id FROM slack_teams);

--changeset boothby:update-data-slack_teams
UPDATE slack_teams s SET level_id = (SELECT l.id FROM levels l WHERE l.slack_team_id = s.id);
--rollback update slack_teams set level_id = null;

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
            _public_message_per_week bigint;
            _slack_team_id bigint;
            _slack_team_nb_users bigint;
            _level_id bigint;
            _level bigint;
            _level_experience bigint;
            _level_next_experience bigint;
            _level_max_experience bigint;
        BEGIN

            -- Grant XP only if user has sent less than 5 times
            if (_reason = ''PUBLIC_MESSAGE'') then
                select nb_messages into _public_message_per_week from (
                    SELECT date_trunc(''week'', obtained_at) AS week_start , count(*) as nb_messages FROM experiences where reason = ''PUBLIC_MESSAGE'' and slack_id = _slack_id and date_trunc(''week'', obtained_at) = date_trunc(''week'', now()) GROUP BY 1
                ) as _temp_query;
            else
                _public_message_per_week = 0;
            end if;

            if(_public_message_per_week < 5) then

                -- Update Slack User experience
                update slack_users set experience = experience + _experience where slack_id = _slack_id;

                -- Get Slack Team ID
                select slack_team_id into _slack_team_id from slack_users where slack_id = _slack_id;
                if (_slack_team_id is null) then
                    select id into _slack_team_id from slack_teams where bot_user_id = _slack_id;
                end if;

                -- Get Level
                select level_id into _level_id from slack_teams where id = _slack_team_id;
                select level into _level from levels where id = _level_id;
                select experience into _level_experience from levels where id = _level_id;
                select max_experience into _level_max_experience from levels where id = _level_id;
                
                -- Bump level if experience target is reached
                if(_level_experience + _experience >= _level_max_experience) then

                    -- Update current level experience
                    update levels set experience = max_experience where id = _level_id;

                    -- Compute experience reported to next level
                    _level_next_experience = _experience - _level_max_experience + _level_experience;

                    -- Compute max_experience for next level
                    select count(*) into _slack_team_nb_users from slack_users where slack_team_id = _slack_team_id;
                    _level_max_experience = 800 + _level * _slack_team_nb_users * 5;

                    -- Create new level
                    insert into levels (slack_team_id, level, experience, max_experience) values (_slack_team_id, _level + 1, _level_next_experience, _level_max_experience) returning id into _level_id;

                else 

                    -- Update level experience
                    update levels set experience = experience + _experience where id = _level_id;

                end if;

                -- Update Slack Team level
                update slack_teams set level_id = _level_id where id = _slack_team_id;

                -- Insert in experience history
                insert into experiences(slack_id, slack_team_id, reason, experience) values (_slack_id, _slack_team_id, _reason, _experience);

            end if;

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
            _slack_team slack_teams%rowtype;
            _level levels%rowtype;
            _previous_level levels%rowtype;
        BEGIN

            -- Get experience infos
            select * into _experience from experiences where id = _id;

            -- Get Slack Team infos
            select * into _slack_team from slack_teams where id = _experience.slack_team_id;

            -- Get Level
            select * into _level from levels where id = _slack_team.level_id;

            -- Get previous level experience
            select * into _previous_level from levels where slack_team_id = _level.slack_team_id and level = _level.level - 1;

            -- If there is a previous level and experience goes below 0, we decrease it
            if(_previous_level.experience is not null and _level.experience - _experience.experience < 0) then
            
                -- Update previous level
                update levels set experience = _previous_level.experience - _experience.experience + _level.experience where id = _previous_level.id;

                -- Delete current level
                delete from levels where id = _level.id;

                -- Set current level to previous level
                _level.id = _previous_level.id;

            else 

                -- Update level experience
                update levels set experience = experience - _experience.experience where id = _level.id;

            end if;

            -- Update Slack User experience
            update slack_users set experience = experience - _experience.experience where slack_id = _experience.slack_id;

            -- Update Slack Team level
            update slack_teams set level_id = _level.id where id = _slack_team.id;

            -- Delete in experience history
            delete from experiences where id = _id;

            return true;
        END;
';
--rollback drop function if exists remove_xp;

--changeset boothby:update-data-dialogs-intro
UPDATE dialogs SET messages = '{"0":{"channel":"pm_everybody","wait":0,"text":"Salut !","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"pm_everybody","wait":800,"text":"Tu ne me connais peut-être pas, je suis Boothby, le bot du Green IT. Je publie régulièrement des infos dans #greenit mais parfois, je m''adresse directement à vous en message privé.","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"pm_everybody","wait":800,"text":"Acceptes-tu de recevoir sur ce canal des astuces, quizz ou infos pour t''aider à améliorer ton impact écologique au sein de ton entreprise ? Rassure-toi, je ne suis pas aussi bavard que j''en ai l''air :wink:","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"4","text":":-1: Non, merci."},{"id":"3","text":":+1: Avec plaisir !"}],"next":"3"},"3":{"channel":"pm_everybody","wait":800,"text":"Super ! Content de pouvoir échanger avec toi. A très vite !","xp":0,"blocks":[],"attachments":[],"outputs":[],"next":"4"},"4":{"channel":"pm_everybody","wait":800,"text":"Dommage... Mais je respecte ton choix ! Tu ne recevras plus de message de ma part.","xp":0,"blocks":[],"attachments":[],"outputs":[]}}' where name = 'Consent PM';
UPDATE dialogs SET messages = '{"0":{"channel":"nowhere","wait":0,"text":"Bonjour tout le monde !","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"nowhere","wait":3000,"text":"Vous connaissez le Green IT ?","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"nowhere","wait":3000,"text":"Que vous soyez expert ou débutant, on essaye d''y voir plus clair en débattant des solutions possibles pour rendre l''IT un peu meilleur.","xp":0,"blocks":[],"attachments":[],"outputs":[{"id":"3","text":"Default"}],"next":"3"},"3":{"channel":"nowhere","wait":9200,"text":"Rendez-vous chaque semaine dans ce canal pour participer à cette aventure ! :rocket:","xp":0,"blocks":[],"attachments":[],"outputs":[]}}' where name = 'Welcome Message';
--rollback update dialogs SET messages = '{"0":{"channel":"pm_everybody","wait":0,"text":"Salut !","blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"pm_everybody","wait":800,"text":"Tu ne me connais peut-être pas, je suis Boothby, le bot du Green IT. Je publie régulièrement des infos dans #greenit mais parfois, je m''adresse directement à vous en message privé.","blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"pm_everybody","wait":800,"text":"Acceptes-tu de recevoir sur ce canal des astuces, quizz ou infos pour t''aider à améliorer ton impact écologique au sein de ton entreprise ? Rassure-toi, je ne suis pas aussi bavard que j''en ai l''air :wink:","blocks":[],"attachments":[],"outputs":[{"id":"4","text":":-1: Non, merci."},{"id":"3","text":":+1: Avec plaisir !"}],"next":"3"},"3":{"channel":"pm_everybody","wait":800,"text":"Super ! Content de pouvoir échanger avec toi. A très vite !","blocks":[],"attachments":[],"outputs":[],"next":"4"},"4":{"channel":"pm_everybody","wait":800,"text":"Dommage... Mais je respecte ton choix ! Tu ne recevras plus de message de ma part.","blocks":[],"attachments":[],"outputs":[]}}' where name = 'Consent PM';
--rollback update dialogs SET messages = '{"0":{"channel":"nowhere","wait":0,"text":"Bonjour tout le monde !","blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"nowhere","wait":3000,"text":"Vous connaissez le Green IT ?","blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"nowhere","wait":3000,"text":"Que vous soyez expert ou débutant, on essaye d''y voir plus clair en débattant des solutions possibles pour rendre l''IT un peu meilleur.","blocks":[],"attachments":[],"outputs":[{"id":"3","text":"Default"}],"next":"3"},"3":{"channel":"nowhere","wait":9200,"text":"Rendez-vous chaque semaine dans ce canal pour participer à cette aventure ! :rocket:","blocks":[],"attachments":[],"outputs":[]}}' where name = 'Welcome Message';
