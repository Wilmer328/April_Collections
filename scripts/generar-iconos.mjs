/**
 * Genera los iconos PNG de la PWA.
 *
 * Se generan con un script en lugar de guardar imágenes hechas a mano por dos
 * razones: el resultado es reproducible —cualquiera puede volver a crearlos con
 * `npm run iconos`— y si cambia el color de marca basta editar un valor aquí en
 * vez de rehacer los archivos en un editor.
 *
 * Escribe el PNG a mano con el módulo zlib de Node, sin dependencias externas:
 * un PNG es una cabecera fija más tres bloques (IHDR, IDAT, IEND), cada uno con
 * su comprobación CRC.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Colores de marca, los mismos que styles/brand.css. */
const FONDO = [158, 63, 82]; // --rose-dark
const DIAMANTE = [253, 248, 244]; // --cream

/** Tamaños que pide la especificación de manifiesto web. */
const TAMANOS = [192, 512];

/** Margen de seguridad para iconos «maskable»: el sistema recorta los bordes. */
const ZONA_SEGURA = 0.7;

const RADIO_ESQUINA = 0.18;

const CRC_TABLA = construirTablaCrc();

function construirTablaCrc() {
  const tabla = new Int32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[n] = c;
  }

  return tabla;
}

function crc32(datos) {
  let c = 0xffffffff;

  for (const byte of datos) {
    c = CRC_TABLA[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

/** Arma un bloque PNG: longitud, tipo, datos y CRC. */
function bloque(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);

  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);

  const comprobacion = Buffer.alloc(4);
  comprobacion.writeUInt32BE(crc32(cuerpo));

  return Buffer.concat([longitud, cuerpo, comprobacion]);
}

/**
 * Convierte una rejilla de píxeles RGBA en un archivo PNG.
 *
 * @param {number} lado
 * @param {Buffer} pixeles lado × lado × 4 bytes.
 * @returns {Buffer}
 */
function armarPng(lado, pixeles) {
  const FIRMA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // color RGBA
  // Los tres siguientes quedan en 0: compresión, filtro e interlazado estándar.

  // Cada fila va precedida de un byte que indica el filtro aplicado; 0 = ninguno.
  const conFiltro = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y += 1) {
    conFiltro[y * (lado * 4 + 1)] = 0;
    pixeles.copy(conFiltro, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }

  return Buffer.concat([
    FIRMA,
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(conFiltro, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Dibuja el icono: cuadrado redondeado de color de marca con un diamante
 * centrado, en referencia al 💎 de la cabecera de la aplicación.
 *
 * @param {number} lado
 * @returns {Buffer}
 */
function dibujarIcono(lado) {
  const pixeles = Buffer.alloc(lado * lado * 4);

  const centro = lado / 2;
  const radio = lado * RADIO_ESQUINA;
  const mitadDiamante = (lado * ZONA_SEGURA) / 2 / 1.6;

  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      const i = (y * lado + x) * 4;

      // Cuadrado con esquinas redondeadas: fuera del radio, transparente.
      const dx = Math.max(radio - x, 0, x - (lado - radio));
      const dy = Math.max(radio - y, 0, y - (lado - radio));
      if (Math.hypot(dx, dy) > radio) {
        continue;
      }

      // Diamante: un cuadrado girado 45°, que es |x| + |y| <= r.
      const dentroDelDiamante =
        Math.abs(x - centro) + Math.abs(y - centro) <= mitadDiamante;

      const color = dentroDelDiamante ? DIAMANTE : FONDO;

      pixeles[i] = color[0];
      pixeles[i + 1] = color[1];
      pixeles[i + 2] = color[2];
      pixeles[i + 3] = 255;
    }
  }

  return armarPng(lado, pixeles);
}

const destino = fileURLToPath(new URL('../public/', import.meta.url));
mkdirSync(destino, { recursive: true });

for (const lado of TAMANOS) {
  const archivo = `${destino}icono-${lado}.png`;
  const png = dibujarIcono(lado);
  writeFileSync(archivo, png);
  console.log(`icono-${lado}.png  ${png.length} bytes`);
}
