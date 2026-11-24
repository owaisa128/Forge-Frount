const PLACEHOLDER_PROFILE_VALUES = new Set([
  'demo',
  'lorem ipsum',
  'n/a',
  'na',
  'none',
  'placeholder',
  'sample',
  'test',
  'undefined',
  'xyz',
]);

export function getTrainerProfileText(value) {
  if (typeof value !== 'string') return '';

  const text = value.trim();
  if (
    !text ||
    PLACEHOLDER_PROFILE_VALUES.has(text.toLowerCase()) ||
    /^(.)\1{5,}$/i.test(text)
  ) {
    return '';
  }

  return text;
}

export function getTrainerSpecialization(trainer) {
  return (
    getTrainerProfileText(trainer?.specialization) ||
    getTrainerProfileText(trainer?.trainerProfile?.specialization)
  );
}

export function isDirectoryTrainer(trainer) {
  return Boolean(getTrainerSpecialization(trainer));
}
