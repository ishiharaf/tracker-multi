import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts"
import * as path from "https://deno.land/std@0.110.0/path/mod.ts"

interface LogInfo {
	billable: number
	log: string[]
}

const openFile = (filename: string): any => {
	try {
		return Deno.readTextFileSync(filename)
	} catch(err) {
		if (err) return console.error(err)
	}
}

const writeFile = (filename: string, data: string): void => {
	try {
		Deno.writeTextFileSync(filename, data)
	} catch(err) {
		if (err) return console.error(err)
	}
}

const splitLines = (lines: string): string[] => {
	return lines.split(/\r\n|\n\r|\n|\r/)
}

const filterLine = (line: string): string[] => {
	const filter = ["~", "-"]
	const array = line.split(" ")
	return array.filter(el => !filter.includes(el))
}

const getYear = (date: Date): string => {
	return date.getFullYear().toString()
}
const getMonth = (date: Date): string => {
	return (date.getMonth() + 1).toString().padStart(2, "0")
}

const getDate = (date: Date): string => {
	return date.getDate().toString().padStart(2, "0")
}

const getHours = (minutes: number): string => {
	const hour = Math.floor(minutes / 60).toString().padStart(2, "0")
	const minute = Math.floor(minutes % 60).toString().padStart(2, "0")
	return `${hour}:${minute}`
}

const getHoursDec = (minutes: number): string => {
	return (minutes / 60).toFixed(2).padStart(5, "0")
}

const getMinutesDiff = (start: Date, end: Date): number => {
	const seconds = 1000, minutes = 60
	return ((end.getTime() - start.getTime()) / seconds) / minutes
}

const getBillableTime = (line: string): number => {
	const entry = filterLine(line)
	const date = entry[0]
	entry.shift()

	let billable = 0
	for (let i = 0; i < entry.length; i += 2) {
		const start = new Date(`${date} ${entry[i]}`)
		const end = new Date(`${date} ${entry[i + 1]}`)

		if (end < start) {
			end.setDate(end.getDate() + 1)
		}
		billable += getMinutesDiff(start, end)
	}
	return billable
}

const getAmount = (minutes: number, rate: number): string => {
	const hours = Number((minutes / 60).toFixed(2))
	return (hours * rate).toFixed(2)
}

const getCompany = (): string => {
	const file = `${args.c}.info`
	const folder = "info"
	return path.join(folder, file)
}

const getContractor = (): string => {
	const file = "contractor.info"
	const folder = "info"
	return path.join(folder, file)
}

const getInvoice = (): string => {
	const file = `${path.basename(args.i, path.extname(args.i))}.${args.o}`
	const folder = "invoices"
	return path.join(folder, file)
}

const getName = (date: Date): string => {
	return `${getYear(date)}-${getMonth(date)}`
}

const getLog = (): string => {
	const file = `${path.basename(args.i, path.extname(args.i))}.log`
	const folder = "hours"
	return path.join(folder, file)
}

const getExpenses = (): string => {
	const file = `${path.basename(args.i, path.extname(args.i))}.log`
	const folder = "expenses"
	return path.join(folder, file)
}

const txtExpenses = (amount: number): string => {
	const log = openFile(getExpenses())
	let txt = "", subtotal = 0

	const lines = splitLines(log)
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.charAt(0) !== "#") {
			const str = line.split(" ")
			const expense = Number(str[str.length - 1])
			str.pop(), str.shift()
			const item = `${str.join(" ")} = $${expense.toFixed(2)}\n`

			txt += item, subtotal += expense
		}
	}

	const total = amount + subtotal
	return `\n\nADDITIONAL EXPENSES\n` +
		   `${txt}\n` +
		   `  SUBTOTAL = $${subtotal.toFixed(2)}\n` +
		   `     TOTAL = $${total.toFixed(2)}`
}

const txtHours = (log: string[]): string => {
	let result = ""
	for (let i = 0; i < log.length; i++) {
		const line = log[i].split(" ")
		const date = line[0]
		const minutes = Number(line[1])
		const hours = args.d ? getHoursDec(minutes) : getHours(minutes)
		const rate = args.r
		const amount = getAmount(minutes, rate)

		result += `${date} > ${hours} x $${rate} = $${amount}\n`
	}
	return result
}

const writeTxt = (info: LogInfo): void => {
	const invoice = getInvoice()
	const contractor = openFile(getContractor())
	const company = openFile(getCompany())
	const minutes = info.billable
	const hours = args.d ? getHoursDec(minutes) : getHours(minutes)
	const rate = args.r
	const amount = getAmount(minutes, rate)

	const now = new Date()
	let txt = `INVOICE #${getYear(now)}${getMonth(now)}${getDate(now)}\n` +
			  `${getYear(now)}/${getMonth(now)}/${getDate(now)}\n\n` +
			  `SENDER\n` +
			  `${contractor}\n\n` +
			  `RECIPIENT\n` +
			  `${company}\n\n` +
			  `DATE         HOURS   RATE   AMOUNT\n` +
			  `${txtHours(info.log)}\n` +
			  `     HOURS = ${hours}\n` +
			  `    AMOUNT = $${amount}`

	if (args.a) txt += txtExpenses(Number(amount))
	writeFile(invoice, txt)
}

const parseLog = (filename: string): void => {
	const data = openFile(filename)

	let totalBillable = 0, log = []
	const lines = splitLines(data)
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.charAt(0) !== "#") {
			const billable = getBillableTime(line)
			const date = line.slice(0, 10)

			totalBillable += billable
			log.push(`${date} ${billable}`)
		}
	}
	const info = {
		billable: totalBillable, log: log
	}

	if (args.o === "txt") writeTxt(info)
}

const showHelp = (): void => {
	console.info('"-h | --help" displays this message')
	console.info('"-w | --write" writes an invoice.')
	console.info('"-a | --add" includes additional expenses on the invoice')
	console.info('"-i | --input" takes a file as the input. Default is "MM-DD.log"')
	console.info('"-o | --output" changes the output format. Default is "txt". It currently supports "txt" and "html"')
	console.info('"-d | --decimal" changes the hours on the invoice to decimal')
	console.info('"-c | --company" changes the billed client. Pass the name without the ".info". Default is "company"')
	console.info('"-r | --rate" changes the hourly rate. Default is "16"')
}

const defaults = {
	w: false,
	i: getName(new Date()),
	o: "txt",
	c: "company",
	h: false,
	d: false,
	a: false,
	r: 16
}
const args = parse(Deno.args, {
    default: defaults,
    boolean: ["w", "h", "d", "a"],
    string: ["i", "o", "c"],
    alias: {
		w: "write",
		i: "input",
		o: "output",
		c: "company",
		h: "help",
		d: "decimal",
		a: "add",
		r: "rate"
	}
})

if (args.w) {
	parseLog(getLog())
}
if (args.h) {
	showHelp()
}