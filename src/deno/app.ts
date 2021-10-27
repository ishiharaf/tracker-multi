import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts"
import * as path from "https://deno.land/std@0.110.0/path/mod.ts"

interface LogInfo {
	billable:number
	log:string[]
}

const writeFile = (file:string, data:string):void => {
	try {
		Deno.writeTextFileSync(file, data)
	} catch(err) {
		if (err) return console.error(err)
	}
}

const splitLines = (lines:string):string[] => {
	return lines.split(/\r\n|\n\r|\n|\r/)
}

const filterLine = (line:string):string[] => {
	const filter = ["~", "-"]
	const arr = line.split(" ")
	return arr.filter(el => !filter.includes(el))
}

const getYear = (date:Date):string => {
	return date.getFullYear().toString()
}
const getMonth = (date:Date):string => {
	return (date.getMonth() + 1).toString().padStart(2, "0")
}

const getDate = (date:Date):string => {
	return date.getDate().toString().padStart(2, "0")
}

const getHours = (minutes:number):string => {
	const hour = Math.floor(minutes / 60).toString().padStart(2, "0")
	const minute = Math.floor(minutes % 60).toString().padStart(2, "0")
	return `${hour}:${minute}`
}

const getHoursDec = (minutes:number):string => {
	return (minutes / 60).toFixed(2).padStart(5, "0")
}

const getMinutesDiff = (start:Date, end:Date):number => {
	const seconds = 1000, minutes = 60
	return ((end.getTime() - start.getTime()) / seconds) / minutes
}

const getBillableTime = (line:string):number => {
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

const getAmount = (minutes:number, rate:number):number => {
	const hours = Number((minutes / 60).toFixed(2))
	return Number((hours * rate).toFixed(2))
}

const getCompany = ():string => {
	const file = `${args.c}.info`
	const folder = "info"
	return path.join(folder, file)
}

const getContractor = ():string => {
	const file = "contractor.info"
	const folder = "info"
	return path.join(folder, file)
}

const getHtml = ():string => {
	const file = "invoice.html"
	const folder = "templates"
	return path.join(folder, file)
}

const getInvoice = (log:string):string => {
	const file = `${path.basename(log, path.extname(log))}.${args.o}`
	console.log(path.basename(log, path.extname(log)))
	const folder = "invoices"
	return path.join(folder, file)
}

const getName = (date:Date):string => {
	return `${getYear(date)}-${getMonth(date)}`
}

const getLog = (name:string):string => {
	const file = name.includes(".log") ? name : `${name}.log`
	const folder = "hours"
	return path.join(folder, file)
}

const getExpenses = ():string => {
	const file = args.i.includes(".log") ? args.i : `${args.i}.log`
	const folder = "expenses"
	return path.join(folder, file)
}

const txtExpenses = (amount:number):string => {
	const log = Deno.readTextFileSync(getExpenses())
	let txt = "", subtotal = 0

	const lines = splitLines(log)
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.charAt(0) !== "#") {
			const str = line.split(" ")
			const expense = str[str.length - 1]
			str.pop(), str.shift()
			const item = `${str.join(" ")} = $${expense}\n`

			txt += item, subtotal += Number(expense)
		}
	}

	const total = (amount + subtotal).toFixed(2)
	return `\n\nADDITIONAL EXPENSES\n` +
		   `${txt}\n` +
		   `  SUBTOTAL = $${subtotal}\n` +
		   `     TOTAL = $${total}`
}

const txtHours = (log:string[]):string => {
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

const writeTxt = (file:string, info:LogInfo):void => {
	const invoice = getInvoice(file)
	const contractor = Deno.readTextFileSync(getContractor())
	const company = Deno.readTextFileSync(getCompany())
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

	if (args.a) txt += txtExpenses(amount)
	writeFile(invoice, txt)
}

const htmlExpenses = (amount:number):string => {
	const log = Deno.readTextFileSync(getExpenses())
	let subtotal = 0
	let html = `
	<div id="additionalExpenses" class="header" style="margin-top: 3rem;">
		<div class="separator"></div>
		<div class="item"><p>Date</p></div>
		<div class="item"><p>Misc. Expenses</p></div>
		<div class="item"><p></p></div>
		<div class="amount end"><p>Amount</p></div>
	</div>
	<div id="log">`

	const lines = splitLines(log)
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.charAt(0) !== "#") {
			const str = line.split(" ")
			const date = str[0]
			const expense = str[str.length - 1]
			str.pop(), str.shift()
			const item = str.join(" ")
			const div = `
		<div class="day">
			<div class="item">${date}</div>
			<div class="item" style="flex-basis: 60%;">${item}</div>
			<div class="amount end">$${expense}</div>
		</div>`

			html += div, subtotal += Number(expense)
		}
	}

	const total = (amount + subtotal).toFixed(2)
	html += `
	</div>
	<div class="total">
		<div><b>Subtotal</b></div>
		<div class="end">$${subtotal}</div>
	</div>
	<div class="total">
		<div><b>Total</b></div>
		<div class="end">$${total}</div>
	</div>`

	return html
}

const htmlHours = (log:string[]):string => {
	let result = ""
	for (let i = 0; i < log.length; i++) {
		const line = log[i].split(" ")
		const date = line[0]
		const minutes = Number(line[1])
		const hours = args.d ? getHoursDec(minutes) : getHours(minutes)
		const rate = args.r
		const amount = getAmount(minutes, rate)
		const div = `
		<div class="day">
			<div class="item">${date}</div>
			<div class="item">${hours}</div>
			<div class="item">$${rate}</div>
			<div class="amount end">$${amount}</div>
		</div>`
		result += div
	}
	return result
}

const writeHtml = (file:string, info:LogInfo):void => {
	const invoice = getInvoice(file)
	const contractor = Deno.readTextFileSync(getContractor())
	const company = Deno.readTextFileSync(getCompany())
	const template = Deno.readTextFileSync(getHtml())
	const position = template.search("<body>") + 6
	const minutes = info.billable
	const hours = args.d ? getHoursDec(minutes) : getHours(minutes)
	const rate = args.r
	const amount = getAmount(minutes, rate)

	const now = new Date()
	const content = `
	<div id="title">Invoice #${getYear(now)}${getMonth(now)}${getDate(now)}</div>
	<div id="subtitle">${getYear(now)}/${getMonth(now)}/${getDate(now)}</div>
	<div class="divisor"></div>
	<div id="info" class="header">
		<div class="item">
			<p>Sender</p>
			<div>${contractor}</div>
		</div>
		<div class="item">
			<p>Recipient</p>
			<div>${company}</div>
		</div>
	</div>
	<div id="expenses" class="header">
		<div class="separator"></div>
		<div class="item"><p>Date</p></div>
		<div class="item"><p>Hours</p></div>
		<div class="item"><p>Rate</p></div>
		<div class="amount end"><p>Amount</p></div>
	</div>
	<div id="log">${htmlHours(info.log)}
	</div>
	<div class="total">
		<div><b>Total Hours</b></div>
		<div class="end">${hours}</div>
	</div>
	<div class="total">
		<div><b>Total Amount</b></div>
		<div class="end">$${amount}</div>
	</div>`

	let html = template.slice(0, position) + content
	if (args.a) html += htmlExpenses(amount)
	html += template.slice(position)

	writeFile(invoice, html)
}

const parseLog = (file:string):void => {
	try {
		const data = Deno.readTextFileSync(file)

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

		if (args.o === "txt") writeTxt(file, info)
		if (args.o === "html") writeHtml(file, info)
	} catch (err) {
		if (err) return console.error(`Couldn't read ${file}`)
	}
}

const showHelp = () => {
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
	parseLog(getLog(args.i))
}
if (args.h) {
	showHelp()
}