const DEFAULT_SKILL_TYPES = new Set(['absence', 'break', 'rest']);

export const isDefaultCommonSkill = (skill) => DEFAULT_SKILL_TYPES.has(skill?.type);

export const getAllowedSkillsForUser = ({ skills, user }) => {
  if (!user) return [];

  const allowedSkillIds = new Set(
    (Array.isArray(user.allowedSkills) ? user.allowedSkills : [])
      .map((skillId) => String(skillId))
  );

  return (Array.isArray(skills) ? skills : []).filter((skill) => (
    isDefaultCommonSkill(skill) || allowedSkillIds.has(String(skill?._id))
  ));
};

export const buildAllowedSkillsSet = (skills) => new Set(
  (Array.isArray(skills) ? skills : []).map((skill) => String(skill._id))
);