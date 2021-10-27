const fs = require("fs")
const path = require("path")

const writeFile = (file, data) => {
	fs.writeFile(file, data, err => {
		if (err) return console.error(err)
	})
}

const splitLines = (lines) => {
	return lines.split(/\r\n|\n\r|\n|\r/)
}

const filterLine = (line) => {
	const filter = ["~", "-"]
	const arr = line.split(" ")
	return arr.filter(el => !filter.includes(el))
}

const getYear = (date) => {
	return date.getFullYear().toString()
}
const getMonth = (date) => {
	return (date.getMonth() + 1).toString().padStart(2, "0")
}

const getDate = (date) => {
	return date.getDate().toString().padStart(2, "0")
}

const getHours = (minutes) => {
	const hour = Math.floor(minutes / 60).toString().padStart(2, "0")
	const minute = Math.floor(minutes % 60).toString().padStart(2, "0")
	return `${hour}:${minute}`
}

const getHoursDec = (minutes) => {
	return (minutes / 60).toFixed(2).padStart(5, "0")
}

const getMinutesDiff = (startDate, endDate) => {
	const seconds = 1000, minutes = 60
	return ((endDate - startDate) / seconds) / minutes
}

const getBillableTime = (line) => {
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

const getAmount = (minutes, rate) => {
	const hours = Number((minutes / 60).toFixed(2))
	return (hours * rate).toFixed(2)
}

const getCompany = () => {
	const file = `${argv.c}.info`
	const folder = "info"
	return path.resolve(folder, file)
}

const getContractor = () => {
	const file = "contractor.info"
	const folder = "info"
	return path.resolve(folder, file)
}

const getHtml = () => {
	const file = "invoice.html"
	const folder = "templates"
	return path.resolve(folder, file)
}

const getInvoice = (log) => {
	const file = `${path.basename(log, path.extname(log))}.${argv.o}`
	const folder = "invoices"
	return path.resolve(folder, file)
}

const getName = (date) => {
	return `${getYear(date)}-${getMonth(date)}`
}

const getLog = (name) => {
	const file = name.includes(".log") ? name : `${name}.log`
	const folder = "hours"
	return path.resolve(folder, file)
}

const getExpenses = () => {
	const file = argv.i.includes(".log") ? argv.i : `${argv.i}.log`
	const folder = "expenses"
	return path.resolve(folder, file)
}

const txtExpenses = (amount) => {
	const log = fs.readFileSync(getExpenses()).toString()
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

	const total = (Number(amount) + subtotal).toFixed(2)
	return `\n\nADDITIONAL EXPENSES\n` +
		   `${txt}\n` +
		   `  SUBTOTAL = $${subtotal}\n` +
		   `     TOTAL = $${total}`
}

const txtHours = (log) => {
	let result = ""
	for (let i = 0; i < log.length; i++) {
		const line = log[i].split(" ")
		const date = line[0]
		const minutes = line[1]
		const hours = argv.d ? getHoursDec(minutes) : getHours(minutes)
		const rate = argv.r
		const amount = getAmount(minutes, rate)

		result += `${date} > ${hours} x $${rate} = $${amount}\n`
	}
	return result
}

const writeTxt = (file, info) => {
	const invoice = getInvoice(file)
	const contractor = fs.readFileSync(getContractor()).toString()
	const company = fs.readFileSync(getCompany()).toString()
	const minutes = info.billable
	const hours = argv.d ? getHoursDec(minutes) : getHours(minutes)
	const rate = argv.r
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

	if (argv.a) txt += txtExpenses(amount)
	writeFile(invoice, txt)
}

const htmlExpenses = (amount) => {
	const log = fs.readFileSync(getExpenses()).toString()
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

	const total = (Number(amount) + subtotal).toFixed(2)
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

const htmlHours = (log) => {
	let result = ""
	for (let i = 0; i < log.length; i++) {
		const line = log[i].split(" ")
		const date = line[0]
		const minutes = line[1]
		const hours = argv.d ? getHoursDec(minutes) : getHours(minutes)
		const rate = argv.r
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

const writeHtml = (file, info) => {
	const invoice = getInvoice(file)
	const contractor = fs.readFileSync(getContractor()).toString()
	const company = fs.readFileSync(getCompany()).toString()
	const template = fs.readFileSync(getHtml()).toString()
	const position = template.search("<body>") + 6
	const minutes = info.billable
	const hours = argv.d ? getHoursDec(minutes) : getHours(minutes)
	const rate = argv.r
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
	if (argv.a) html += htmlExpenses(amount)
	html += template.slice(position)

	writeFile(invoice, html)
}

const parseLog = (file) => {
	fs.readFile(file, "utf-8", (err, data) => {
		if (err) return console.error(`Couldn't read ${file}`)

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

		if (argv.o === "txt") writeTxt(file, info)
		if (argv.o === "html") writeHtml(file, info)
	})
}

const showHelp = () => {
	console.info('"-h" displays this message')
	console.info('"-w" writes an invoice.')
	console.info('"-a" includes additional expenses on the invoice')
	console.info('"-i" takes a file as the input. Default is "MM-DD.log"')
	console.info('"-o" changes the output format. Default is "txt". It currently supports "txt" and "html"')
	console.info('"-d" changes the hours on the invoice to decimal')
	console.info('"-c" changes the billed client. Pass the name without the ".info". Default is "company"')
	console.info('"-r" changes the hourly rate. Default is "16"')
}

const parser = require("./parser")
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
const args = process.argv.slice(2)
const argv = parser(args, opts={default: defaults})

if (argv.w) {
	parseLog(getLog(argv.i))
}
if (argv.h) {
	showHelp()
}