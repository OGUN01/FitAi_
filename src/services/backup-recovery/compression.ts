export async function compressData(data: string): Promise<string> {
  try {
    let compressed = data.replace(/(.)\1{4,}/g, (match, char) => {
      return `${char}#${match.length}#`;
    });
    return `COMPRESSED:${compressed}`;
  } catch {
    return data;
  }
}

export async function decompressData(data: string): Promise<string> {
  if (!data.startsWith("COMPRESSED:")) {
    return data;
  }
  try {
    let decompressed = data.slice(11);
    decompressed = decompressed.replace(/(.)\#(\d+)\#/g, (_, char, count) => {
      return char.repeat(parseInt(count, 10));
    });
    return decompressed;
  } catch {
    return data;
  }
}
