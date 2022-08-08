--liquibase formatted sql

--changeset boothby:edit-function-grant_xp
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

            -- Grant XP only if user has sent less than 5 times in the week
            if (_reason = ''PUBLIC_MESSAGE'') then
                select count(*) into _public_message_per_week from experiences where reason = ''PUBLIC_MESSAGE'' and slack_id = _slack_id and date_trunc(''week'', obtained_at) = date_trunc(''week'', now());
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
