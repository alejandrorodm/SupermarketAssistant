const fs = require('fs')

// ---- Emblema del ticket (centrado en un lienzo S x S) -----------------------
// Devuelve un grupo SVG con el ticket blanco, sus líneas, el badge verde de
// "guardado" y un haz de escaneo. `cx,cy` centro, `scale` tamaño relativo.
function emblem(cx, cy, scale) {
  // Dimensiones base del ticket (sin escalar)
  const w = 300, h = 380
  const x0 = cx - (w / 2) * scale
  const y0 = cy - (h / 2) * scale
  const W = w * scale, H = h * scale
  const r = 30 * scale

  // Borde inferior dentado (torn edge)
  const teeth = 7
  const toothW = W / teeth
  const dip = 24 * scale
  const baseY = y0 + H - dip
  // De derecha a izquierda: tras bajar por el lado derecho, los dientes
  // regresan hasta el lado izquierdo y luego Z cierra subiendo por la izquierda.
  let zig = ''
  for (let i = 0; i < teeth; i++) {
    const sx = x0 + W - i * toothW
    zig += ` L ${(sx - toothW / 2).toFixed(1)} ${(baseY + dip).toFixed(1)} L ${(sx - toothW).toFixed(1)} ${baseY.toFixed(1)}`
  }
  const receiptPath =
    `M ${x0} ${(y0 + r).toFixed(1)}` +
    ` Q ${x0} ${y0} ${(x0 + r).toFixed(1)} ${y0}` +
    ` H ${(x0 + W - r).toFixed(1)}` +
    ` Q ${(x0 + W).toFixed(1)} ${y0} ${(x0 + W).toFixed(1)} ${(y0 + r).toFixed(1)}` +
    ` V ${baseY.toFixed(1)}` +
    zig +
    ` Z`

  // Líneas de texto del ticket
  const lineX = x0 + 38 * scale
  const lineW = W - 76 * scale
  const lines = []
  // cabecera (barra ancha tipo logo)
  lines.push(`<rect x="${lineX}" y="${(y0 + 44 * scale).toFixed(1)}" width="${(lineW * 0.55).toFixed(1)}" height="${(26 * scale).toFixed(1)}" rx="${(13 * scale).toFixed(1)}" fill="#cbd5e1"/>`)
  // filas
  const rowYs = [110, 150, 190]
  for (const ry of rowYs) {
    lines.push(`<rect x="${lineX}" y="${(y0 + ry * scale).toFixed(1)}" width="${(lineW * 0.62).toFixed(1)}" height="${(16 * scale).toFixed(1)}" rx="${(8 * scale).toFixed(1)}" fill="#e2e8f0"/>`)
    lines.push(`<rect x="${(lineX + lineW * 0.74).toFixed(1)}" y="${(y0 + ry * scale).toFixed(1)}" width="${(lineW * 0.26).toFixed(1)}" height="${(16 * scale).toFixed(1)}" rx="${(8 * scale).toFixed(1)}" fill="#e2e8f0"/>`)
  }
  // total (resaltado azul)
  lines.push(`<rect x="${lineX}" y="${(y0 + 236 * scale).toFixed(1)}" width="${(lineW * 0.40).toFixed(1)}" height="${(22 * scale).toFixed(1)}" rx="${(11 * scale).toFixed(1)}" fill="#94a3b8"/>`)
  lines.push(`<rect x="${(lineX + lineW * 0.66).toFixed(1)}" y="${(y0 + 233 * scale).toFixed(1)}" width="${(lineW * 0.34).toFixed(1)}" height="${(28 * scale).toFixed(1)}" rx="${(14 * scale).toFixed(1)}" fill="#2563eb"/>`)

  // Badge verde de "guardado" (check) abajo a la derecha
  const bcx = x0 + W - 6 * scale
  const bcy = y0 + H - 30 * scale
  const br = 58 * scale
  const ck = 26 * scale
  const badge =
    `<circle cx="${bcx.toFixed(1)}" cy="${bcy.toFixed(1)}" r="${br.toFixed(1)}" fill="#10b981" stroke="#ffffff" stroke-width="${(10 * scale).toFixed(1)}"/>` +
    `<path d="M ${(bcx - ck).toFixed(1)} ${bcy.toFixed(1)} l ${(ck * 0.7).toFixed(1)} ${(ck * 0.7).toFixed(1)} l ${(ck * 1.25).toFixed(1)} ${(-ck * 1.4).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="${(13 * scale).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`

  return `
    <g>
      <path d="${receiptPath}" fill="#ffffff"/>
      ${lines.join('\n      ')}
      ${badge}
    </g>`
}

const GRAD = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>`

// 1) Icono completo (legacy): fondo redondeado + emblema
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${GRAD}
  <rect x="0" y="0" width="1024" height="1024" rx="232" fill="url(#bg)"/>
  ${emblem(512, 500, 1.45)}
</svg>`

// 2) Foreground adaptativo: emblema dentro de la zona segura, fondo transparente
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${emblem(508, 512, 1.28)}
</svg>`

// 3) Background adaptativo: solo el gradiente
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${GRAD}
  <rect x="0" y="0" width="1024" height="1024" fill="url(#bg)"/>
</svg>`

fs.writeFileSync('/tmp/icon/full.svg', full)
fs.writeFileSync('/tmp/icon/fg.svg', fg)
fs.writeFileSync('/tmp/icon/bg.svg', bg)
console.log('SVGs generados')
