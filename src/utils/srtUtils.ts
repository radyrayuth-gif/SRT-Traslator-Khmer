export interface SrtEntry {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}

export function parseSrt(data: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  const normalizedData = data.replace(/\r\n/g, "\n");
  const blocks = normalizedData.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const id = lines[0].trim();
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const text = lines.slice(2).join("\n").trim();
        
        entries.push({ id, startTime, endTime, text });
      }
    }
  }

  return entries;
}

export function stringifySrt(entries: SrtEntry[]): string {
  return entries
    .map((entry) => `${entry.id}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`)
    .join("\n");
}
