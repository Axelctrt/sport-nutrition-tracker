-- SportPilot 0.29.0 A20 - granular social fields per friend.
ALTER TABLE social_friend_permissions
ADD COLUMN field_selection_json TEXT;

-- Existing permissions keep their pre-A20 effective scope. The owner's global and
-- per-activity policies still remain the upper bound; A20 only adds a narrower
-- per-friend intersection.
UPDATE social_friend_permissions
SET field_selection_json = '{"common":["activityType","title","date","time","duration","intensity","calories"],"cardio":["distance","sessionType","terrain","stroke","poolLength","bikeType","environment","pace","speed","paceSeries","elevation","heartRate","cadence","intervals","laps","segments","chart"],"strength":["sessionName","muscleGroups","exerciseCount","exercises","sets","repetitions","loads","bodyweight","restTimes","rpe","volume"]}'
WHERE field_selection_json IS NULL OR TRIM(field_selection_json) = '';
