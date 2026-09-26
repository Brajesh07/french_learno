import { initialState, parseState, type State } from './model';

export const SUPPORTED_LANGUAGE = 'fr-FR' as const;
export type LearningLanguage = typeof SUPPORTED_LANGUAGE;
export type ProgressSnapshot = {
  state: State;
  selectedLanguage: LearningLanguage | null;
  revision: number;
};
export type ProgressWrite = ProgressSnapshot & { mutationId: string };

export function emptyProgress(): ProgressSnapshot {
  return { state: structuredClone(initialState), selectedLanguage: null, revision: 0 };
}

export function parseProgressWrite(input: unknown): ProgressWrite {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid progress');
  const value = input as Record<string, unknown>;
  const allowed = ['state', 'selectedLanguage', 'revision', 'mutationId'];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unexpected progress field');
  if (value.selectedLanguage !== SUPPORTED_LANGUAGE) throw new Error('Select a supported language');
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 0) throw new Error('Invalid revision');
  if (typeof value.mutationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.mutationId)) {
    throw new Error('Invalid mutation ID');
  }
  return {
    state: parseState(JSON.stringify(value.state)),
    selectedLanguage: SUPPORTED_LANGUAGE,
    revision: value.revision as number,
    mutationId: value.mutationId,
  };
}
