/** "12m", "3h" since the customer started waiting, and whether that is past the team's reply target. */
export function waitLabel(since: string | null | undefined, targetMinutes: number | null | undefined): { text: string; late: boolean } | null {
  if (!since) return null;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
  const text = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
  return { text: `waiting ${text}`, late: targetMinutes ? mins >= targetMinutes : mins >= 60 };
}
