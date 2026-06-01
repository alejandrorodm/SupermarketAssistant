// Exportación de datos a CSV (descarga en el navegador).

function escapeCSV(value: unknown): string {
  const str = String(value ?? '')
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCSV<T extends object>(filename: string, rows: T[]): void {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => escapeCSV((row as Record<string, unknown>)[h])).join(','),
    ),
  ]
  // BOM para que Excel reconozca UTF-8 (acentos, €)
  const csv = '﻿' + lines.join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
