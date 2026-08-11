export interface TeamProductionLine {
  value: string;
  quantity: number;
}

export function parseTeamProductionLines(input: string): TeamProductionLine[] {
  const results: TeamProductionLine[] = [];
  for (const raw of input.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean)) {
    const range = raw.match(/^(?:nummer\s+)?(\d+)\s*(?:t\/?m|tot(?:\s+en\s+met)?|[-–])\s*(\d+)$/i);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (end < start || end - start > 49) throw new Error("Gebruik een oplopende reeks van maximaal 50 waarden.");
      for (let value = start; value <= end; value += 1) results.push({ value: String(value), quantity: 1 });
      continue;
    }
    const words = raw.match(/^nummer\s+(.+?)\s+(?:twee\s+keer|2\s+keer)$/i);
    const repeated = raw.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
    const value = (words?.[1] ?? repeated?.[1] ?? raw).trim();
    const quantity = words ? 2 : repeated ? Number(repeated[2]) : 1;
    if (!value || !Number.isInteger(quantity) || quantity < 1 || quantity > 9) throw new Error("Gebruik per regel een waarde of 'waarde x aantal' (maximaal 9).");
    results.push({ value, quantity });
  }
  if (!results.length || results.length > 50 || results.reduce((sum, row) => sum + row.quantity, 0) > 99) throw new Error("Gebruik 1 tot 50 regels en maximaal 99 stuks.");
  return results;
}
