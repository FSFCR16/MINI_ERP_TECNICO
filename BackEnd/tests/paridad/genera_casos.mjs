// LOS CASOS DE PARIDAD DEL CÁLCULO (plan del bot, fase 2 · 2026-11-06).
// Corre la fórmula DEL PANEL tal cual (FrontEnd/src/Utils/api.js: procesarData y actualizarPorcentajeCC) sobre miles de
// casos y guarda lo que responde en casos.json.gz (comprimido), con la huella del archivo del panel. La prueba de Python
// (tests/test_calculo_paridad.py) exige que app/calculo.py dé EXACTAMENTE lo mismo, y falla si el panel cambió y estos
// casos no se regeneraron.
//   node tests/paridad/genera_casos.mjs          (desde BackEnd/)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PANEL = join(AQUI, '..', '..', '..', 'FrontEnd', 'src', 'Utils', 'api.js');
const fuente = readFileSync(PANEL, 'utf8');
const huella = createHash('sha256').update(fuente).digest('hex');

// El archivo es un módulo de Next: se evalúa tal cual, solo sin la palabra `export`.
const ctx = { crypto: globalThis.crypto };
vm.createContext(ctx);
vm.runInContext(fuente.replace(/^export /gm, '') + '\n;globalThis.__f = { procesarData, actualizarPorcentajeCC };', ctx);
const { procesarData, actualizarPorcentajeCC } = ctx.__f;

// Azar con semilla: los mismos casos cada vez.
let s = 20261106;
const azar = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const uno = (lista) => lista[Math.floor(azar() * lista.length)];
const dinero = () => uno([0, 0, 0, 5, 10, 12.5, 20, 25, 33.33, 40, 50, 60, 75, 80, 99.99, 100, 120, 150, 180, 199.5, 200,
  220, 250, 291, 300, 350, 396, 400, 450, 500, 750, 1000, 1234.56, Math.round(azar() * 200000) / 100]);
const pequeno = () => uno([0, 0, 0, 0, 5, 10, 12, 15, 20, 25, 30, 35.5, 48, 50, 60, 100, Math.round(azar() * 10000) / 100]);

function caso() {
  const tipo = uno(['CASH', 'CC', 'MIXTO', 'CASH', 'CC', 'MIXTO', 'cash', 'cc', 'mixto', 'Cc']);
  const servicio = dinero();
  const tarjeta = uno([0, Math.round(servicio * azar() * 100) / 100, servicio / 2, dinero()]);
  const minimo = uno([0, 20, 30, 40, 50, 60, 75, 100, 120, Math.round(azar() * 15000) / 100]);
  const fila = {
    tipo_pago: tipo,
    valor_servicio: servicio,
    valor_tarjeta: tarjeta,
    valor_efectivo: uno([0, Math.round((servicio - tarjeta) * 100) / 100, dinero()]),
    porcentaje_tecnico: uno([0, 20, 30, 33.33, 40, 45, 50, 55, 60, 65, 70, 75, 100, Math.round(azar() * 10000) / 100]),
    minimo,
    porcentaje_cc: uno([0, 0, 1.5, 3, 4.5, 8.7, 10, Math.round(azar() * 3000) / 100]),
    partes_gil: pequeno(),
    partes_tecnico: pequeno(),
    tech: uno([0, 0, 0, 0, 0, 50, 100, 150, 200, Math.round(azar() * 30000) / 100]),
    adicional_dolar: uno([0, 1, 2, 2.5, 5, 10]),
    aplica_dolar_empresa: uno(['NO', 'NO', 'SI']),
    dolar_adicional_empresa: uno([0, 1, 3, 5, 7.5]),
    is_cash: uno([false, false, true]),
    total: uno([0, 0, 17, -5.25]),   // lo que traía la fila (algunas ramas no lo cambian)
  };
  return fila;
}

// Los bordes, a propósito: el servicio justo en mínimo + 25, la parte del técnico igual al mínimo, redondeos en ,005.
function bordes() {
  const salida = [];
  for (const tipo of ['CASH', 'CC', 'MIXTO', 'cc', 'mixto']) {
    for (const minimo of [30, 50, 100]) {
      for (const delta of [-0.01, 0, 0.01]) {
        for (const is_cash of [false, true]) {
          salida.push({ tipo_pago: tipo, valor_servicio: minimo + 25 + delta, valor_tarjeta: minimo, valor_efectivo: 25 + delta,
            porcentaje_tecnico: 50, minimo, porcentaje_cc: 3, partes_gil: 0, partes_tecnico: 0, tech: 0, adicional_dolar: 2.5,
            aplica_dolar_empresa: 'NO', dolar_adicional_empresa: 0, is_cash, total: 0 });
          // la parte del técnico (servicio × %) exactamente igual al mínimo
          salida.push({ tipo_pago: tipo, valor_servicio: (minimo * 2) + delta, valor_tarjeta: minimo, valor_efectivo: minimo,
            porcentaje_tecnico: 50, minimo, porcentaje_cc: 0, partes_gil: 0, partes_tecnico: 0, tech: 0, adicional_dolar: 0,
            aplica_dolar_empresa: 'NO', dolar_adicional_empresa: 0, is_cash, total: 0 });
        }
      }
    }
  }
  // totales que caen en ,xx5 (el redondeo de toFixed sobre el valor binario)
  for (const v of [1.005, 2.675, 10.125, 0.015, 123.455, 1000.005, 33.335]) {
    for (const tipo of ['CASH', 'CC']) {
      salida.push({ tipo_pago: tipo, valor_servicio: 500, valor_tarjeta: 0, valor_efectivo: 0, porcentaje_tecnico: 50, minimo: 0,
        porcentaje_cc: 0, partes_gil: 0, partes_tecnico: 0, tech: 0, adicional_dolar: v, aplica_dolar_empresa: 'NO',
        dolar_adicional_empresa: 0, is_cash: false, total: 0 });
    }
  }
  return salida;
}

// De la salida solo lo que se compara (el archivo pesaba 14 MB con la fila entera).
const solo = (f) => ({ total: f.total, valor_servicio: f.valor_servicio, adicional_dolar: f.adicional_dolar, porcentaje_cc: f.porcentaje_cc });
const casos = [...bordes(), ...Array.from({ length: 20000 }, caso)].map((entrada) => ({
  entrada, salida: solo(procesarData({ ...entrada })),
}));
// La comisión de tarjeta (actualizarPorcentajeCC)
const comisiones = Array.from({ length: 3000 }, () => {
  const entrada = { ...caso(), porcentaje_cc_base: uno([null, 0, 1.5, 3, 3.5, 4.99, Math.round(azar() * 1000) / 100]) };
  return { entrada, salida: solo(actualizarPorcentajeCC({ ...entrada })) };
});

writeFileSync(join(AQUI, 'casos.json.gz'), gzipSync(JSON.stringify({ huella_panel: huella, generado: new Date().toISOString().slice(0, 10),
  casos, comisiones })));
console.log(`✓ ${casos.length} casos del total y ${comisiones.length} de la comisión · huella ${huella.slice(0, 12)}`);
