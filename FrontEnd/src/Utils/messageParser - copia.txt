export class TicketParser {

    constructor(text) {

        this.rawText = text

        this.lines = []
        this.fields = {}
        this.moneyData = []
        this.moneyBlocks = []
        this.money = {}
        this.result = {}

        this.FIELD_MAP = {

            company: ["company", "business"],

            job_name: ["job number", "job id", "job", "work order"],

            nombre: ["name", "customer", "client"],

            phone: ["phone number", "phone1", "phone"],

            address: ["address"],

            job_type: ["job type", "service type"],

            date: ["appointment date", "date"],

            time: ["appointment time", "time"]

        }

        this.fieldPriority = this.buildPriorityMap()

    }

    buildPriorityMap() {

        const list = []

        for (const field in this.FIELD_MAP) {

            for (const keyword of this.FIELD_MAP[field]) {

                list.push({ field, keyword })

            }

        }

        list.sort((a, b) => b.keyword.length - a.keyword.length)

        return list

    }

    normalize() {

        this.lines = this.rawText
            .replace(/\r?\n|\r/g, "\n")
            .split("\n")
            .map(l => l.trim().toLowerCase())
            .filter(l => l.length > 0)

    }

    detectField(line) {

        const index = line.indexOf(":")

        if (index === -1) return null

        const key = line.slice(0, index).trim()

        for (const item of this.fieldPriority) {

            if (key === item.keyword)
                return item.field

        }

        return null

    }

    extractFields() {

        const data = {}

        for (let i = 0; i < this.lines.length; i++) {

            const line = this.lines[i]

            const field = this.detectField(line)

            if (!field) continue

            const value = line.split(":")[1].trim()

            if (field === "address") {

                const next = this.lines[i + 1]

                if (next && !next.includes(":"))
                    data[field] = value + " " + next
                else
                    data[field] = value

                continue
            }

            data[field] = value

        }

        this.fields = data

    }

    normalizeJobType() {

        if (!this.fields.job_type) return

        const job = this.fields.job_type.toLowerCase().replace(/\s+/g,"")

        if (job.includes("carkey") || job.includes("car-key"))
            this.fields.job_type = "CAR KEY"

        else if (job.includes("lock"))
            this.fields.job_type = "LOCKOUT"

    }

    scoreMoney(context) {

        if (context === "total") return 100

        if (context === "cash" || context === "credit") return 90

        if (context === "parts" || context === "parts_gil")
            return 40

        return 10

    }

    detectMoneyContext(line) {

        if (!line) return "unknown"

        const text = line.toLowerCase()

        if (/\bcash\b/.test(text))
            return "cash"

        if (/\bcc\b|\bcredit\b|\bscanpay\b|\bcard\b/.test(text))
            return "credit"


        if (/\bparts?\s*gil\b/.test(text))
            return "parts_gil"

        if (/\bparts?\b/.test(text))
            return "parts"

        if (/\btotal\b|\bpaid\b|\bclose\b/.test(text))
            return "total"

        return "unknown"

    }

    detectContextWindow(index) {

        const same = this.detectMoneyContext(this.lines[index])
        if (same !== "unknown") return same

        if (index + 1 < this.lines.length) {
            const next = this.detectMoneyContext(this.lines[index + 1])
            console.log(next)
            if (next !== "unknown") return next
        }

        if (index - 1 >= 0) {
            const prev = this.detectMoneyContext(this.lines[index - 1])
            console.log(prev)
            if (prev !== "unknown") return prev
        }

        return "unknown"

    }

    extractMoney() {

        const results = []

        const moneyRegex = /(?<![a-z0-9])\$?\s*(\d+(?:[.,]\d+)?)\s*\$?(?![a-z0-9])/gi

        for (let i = 0; i < this.lines.length; i++) {

            const line = this.lines[i]

            if (/phone|tel|mobile/.test(line)) continue

            const matches = [...line.matchAll(moneyRegex)]

            if (matches.length === 0) continue

            const context = this.detectContextWindow(i)

            for (const m of matches) {

                let raw = m[1]

                if (/^\d{5}$/.test(raw)) continue

                if (raw.includes(",") && raw.includes(".")) {
                    raw = raw.replace(/,/g, "")
                } else {
                    raw = raw.replace(",", ".")
                }

                const number = parseFloat(raw)

                if (Number.isNaN(number)) continue

                if (number < 5) continue
                if (number > 4000) continue

                results.push({
                    value: number,
                    context,
                    score: this.scoreMoney(context),
                    lineIndex: i
                })
                console.log(results)
            }

        }

        this.moneyData = results

    }

    detectMoneyBlocks() {

        const blocks = []
        const maxDistance = 3

        for (const item of this.moneyData) {

            let added = false

            for (const block of blocks) {

                const distance = Math.abs(block.lastLine - item.lineIndex)

                if (distance <= maxDistance) {

                    block.items.push(item)
                    block.lastLine = item.lineIndex
                    added = true
                    break

                }

            }

            if (!added) {

                blocks.push({
                    items: [item],
                    firstLine: item.lineIndex,
                    lastLine: item.lineIndex
                })

            }

        }

        this.moneyBlocks = blocks

    }

    classifyMoney() {

        const money = {

            servicio: null,
            cash: 0,
            credit: 0,
            technician: 0,
            tip: 0,
            parts: 0,
            parts_gil: 0

        }

        let bestCandidate = null

        for (const block of this.moneyBlocks) {

            for (const item of block.items) {

                const { value, context, score } = item
                console.log(item, "item")
                if (context === "cash") {

                    if (money.cash > 0 && value < money.cash) {
                        money.tip += value
                        continue
                    }

                    money.cash += value
                    continue
                }

                if (context === "credit") {

                    // si ya hay un credit grande registrado,
                    // y aparece un valor pequeño después,
                    // probablemente es tip o ajuste
                    if (money.credit > 0 && value < money.credit) {
                        money.tip += value
                        continue
                    }

                    money.credit += value
                    continue
                }

                if (context === "parts") {
                    money.parts += value
                    continue
                }

                if (context === "parts_gil") {
                    money.parts_gil += value
                    continue
                }

                if (context === "total") {
                    money.servicio = value
                    continue
                }

                if (!bestCandidate || score > bestCandidate.score) {

                    bestCandidate = {
                        value,
                        score
                    }

                }

            }

        }

        if (money.servicio === null) {

            if (money.cash && money.credit)
                money.servicio = money.cash + money.credit

            else if (money.cash)
                money.servicio = money.cash

            else if (money.credit)
                money.servicio = money.credit

            else if (bestCandidate)
                money.servicio = bestCandidate.value

        }

        this.money = money

    }

    detectPaymentType() {

        const { cash, credit } = this.money

        if (cash && credit) return "MIXTO"

        if (credit) return "CC"

        if (cash) return "CASH"

        return null

    }

    buildResult() {

        const paymentType = this.detectPaymentType()

        this.result = {

            company: this.fields.company || null,
            job_name: this.fields.job_name || null,
            nombre: this.fields.nombre || null,
            job_type: this.fields.job_type || null,
            valor_servicio: this.money.servicio,
            valor_efectivo: this.money.cash,
            valor_tarjeta: this.money.credit,
            pago_tecnico: this.money.technician,
            partes_tecnico: this.money.parts,
            partes_gil: this.money.parts_gil,
            tipo_pago: paymentType

        }

    }

    parse() {

        this.normalize()
        this.extractFields()
        this.normalizeJobType()
        this.extractMoney()
        this.detectMoneyBlocks()
        this.classifyMoney()
        this.buildResult()

        return this.result

    }

}