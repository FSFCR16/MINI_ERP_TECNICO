// Plan del bot, fase 2 · la sinergia panel ↔ servidor.   node --test tests/
import { test } from "node:test"
import assert from "node:assert/strict"
import { aplicaServidor, textoAjustes } from "../src/app/hooks/reconciliaServidor.js"

const fila = (id, total, extra = {}) => ({ id: `tmp-${id}`, id_registro: id, job_name: `J${id}`, total, porcentaje_cc: 0, ...extra })

test("si el servidor dice lo mismo, la lista es la MISMA (no re-render, no aviso)", () => {
    const lista = [fila(1, 152.5), fila(2, -143)]
    const r = aplicaServidor(lista, [{ id: 1, total: 152.5, porcentaje_cc: 0 }, { id: 2, total: -143, porcentaje_cc: 0 }])
    assert.equal(r.ajustes.length, 0)
    assert.equal(r.lista[0], lista[0])
    assert.equal(r.lista[1], lista[1])
})

test("si el servidor dice otro total, gana el servidor, se marca y se avisa", () => {
    const lista = [fila(1, 120), fila(2, 50)]
    const r = aplicaServidor(lista, [{ id: 1, total: 118 }], (x) => x.id_registro, 777)
    assert.equal(r.lista[0].total, 118)
    assert.equal(r.lista[0]._ajustado, 777)
    assert.equal(r.lista[1], lista[1])                      // la otra fila no se toca
    assert.deepEqual(r.ajustes, [{ job_name: "J1", antes: 120, despues: 118 }])
    assert.equal(textoAjustes(r.ajustes), "El total de J1 se ajustó: 120 → 118")
    assert.equal(lista[0].total, 120)                       // no muta la lista original
})

test("números que llegan como texto no cuentan como diferencia", () => {
    const r = aplicaServidor([fila(1, "152.50")], [{ id: 1, total: 152.5 }])
    assert.equal(r.ajustes.length, 0)
})

test("porcentaje_cc del servidor se pone sin aviso de total", () => {
    const r = aplicaServidor([fila(1, 10, { porcentaje_cc: 3 })], [{ id: 1, total: 10, porcentaje_cc: 9 }])
    assert.equal(r.lista[0].porcentaje_cc, 9)
    assert.equal(r.ajustes.length, 0)
})

test("una respuesta sin total (p. ej. Virginia) o vacía no cambia nada", () => {
    const lista = [fila(1, 10)]
    assert.equal(aplicaServidor(lista, [{ id: 1 }]).lista[0], lista[0])
    assert.equal(aplicaServidor(lista, undefined).lista, lista)
    assert.equal(aplicaServidor(lista, [{ id: 1, total: null }]).lista[0], lista[0])
})

test("filas nuevas sin id de base o de otro id no se emparejan", () => {
    const lista = [{ ...fila(1, 10), id_registro: null }, fila(5, 3)]
    const r = aplicaServidor(lista, [{ id: 1, total: 99 }])
    assert.equal(r.ajustes.length, 0)
})

test("varios ajustes se resumen en un solo aviso", () => {
    const lista = [1, 2, 3, 4].map((i) => fila(i, 100))
    const r = aplicaServidor(lista, [1, 2, 3, 4].map((i) => ({ id: i, total: 100 - i })))
    assert.equal(r.ajustes.length, 4)
    assert.match(textoAjustes(r.ajustes), /^4 totales se ajustaron.*J1 100 → 99 · J2 100 → 98 · J3 100 → 97 …$/)
})

test("total 0 del servidor sí se aplica (no se confunde con vacío)", () => {
    const r = aplicaServidor([fila(1, 5)], [{ id: 1, total: 0 }])
    assert.equal(r.lista[0].total, 0)
    assert.equal(r.ajustes.length, 1)
})
