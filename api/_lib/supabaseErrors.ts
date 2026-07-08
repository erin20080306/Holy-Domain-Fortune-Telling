export function isMissingSupabaseSchemaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const e = err as Record<string, unknown>;
  const code = typeof e.code === 'string' ? e.code : '';
  const text = [e.message, e.details, e.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    /schema cache/i.test(text) ||
    /could not find (the )?(table|function)/i.test(text) ||
    /relation .* does not exist/i.test(text)
  );
}
