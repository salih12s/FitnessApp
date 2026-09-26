export interface CustomExerciseFormValues {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
}

export function isCustomExerciseFormComplete(values: CustomExerciseFormValues) {
  return Boolean(
    values.name.trim() && values.muscleGroup && values.equipment.trim(),
  );
}

// Collapses spaces within each line but keeps line breaks, allowing at most
// one blank line between paragraphs.
function normalizeMultilineText(value: string) {
  return value
    .split(/\r\n?|\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeCustomExerciseForm(values: CustomExerciseFormValues) {
  return {
    name: values.name.trim().replace(/\s+/g, ' '),
    muscleGroup: values.muscleGroup,
    equipment: values.equipment.trim().replace(/\s+/g, ' '),
    instructions: normalizeMultilineText(values.instructions) || undefined,
  };
}
