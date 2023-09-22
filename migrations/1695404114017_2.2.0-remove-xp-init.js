/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createFunction(
    'remove_xp',
    [
      {
        mode: 'in',
        name: '_id',
        type: 'bigint'
      }
    ], {
    returns: 'boolean',
    language: 'plpgsql'
  }, `
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
  END;`);
};

exports.down = pgm => {
  pgm.dropFunction(
    'remove_xp',
    [
      {
        mode: 'in',
        name: '_id',
        type: 'bigint'
      }
    ]);
};
