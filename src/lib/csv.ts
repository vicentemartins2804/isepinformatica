/** BOM UTF-8: sem ele, o Excel abre os acentos mal. */
const BOM = String.fromCharCode(0xfeff);

/** Campo CSV entre aspas, com as aspas internas duplicadas. */
export function csvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * CSV com separador ";" e BOM UTF-8, para o Excel em português abrir em colunas e com acentos.
 * Linhas terminadas em CRLF.
 */
export function toCsv(rows: string[][]): string {
  return BOM + rows.map((row) => row.map(csvField).join(";")).join("\r\n") + "\r\n";
}
