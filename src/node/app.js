const fs = require("fs")
const path = require("path")

const openFile = (filename) => {
	try {
		return fs.readFileSync(filename).toString()
	} catch (err) {
		if (err) return console.error(err)
	}
}

const writeFile = (filename, data) => {
	fs.writeFile(filename, data, err => {
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

const getMinutesDiff = (start, end) => {
	const seconds = 1000, minutes = 60
	return ((end - start) / seconds) / minutes
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

const getInvoice = () => {
	const file = `${path.basename(argv.i, path.extname(argv.i))}.${argv.o}`
	const folder = "invoices"
	return path.resolve(folder, file)
}

const getName = (date) => {
	return `${getYear(date)}-${getMonth(date)}`
}

const getLog = () => {
	const file = `${path.basename(argv.i, path.extname(argv.i))}.log`
	const folder = "hours"
	return path.resolve(folder, file)
}

const getExpenses = () => {
	const file = `${path.basename(argv.i, path.extname(argv.i))}.log`
	const folder = "expenses"
	return path.resolve(folder, file)
}

const txtExpenses = (amount) => {
	const log = openFile(getExpenses())
	let txt = "", subtotal = 0

	const lines = splitLines(log)
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.charAt(0) !== "#") {
			const str = line.split(" ")
			const expense = Number(str[str.length - 1])
			str.pop(), str.shift()
			const item = `${str.join(" ")} = $${expense}\n`

			txt += item, subtotal += expense
		}
	}

	const total = amount + subtotal
	return `\n\nADDITIONAL EXPENSES\n` +
		   `${txt}\n` +
		   `  SUBTOTAL = $${subtotal.toFixed(2)}\n` +
		   `     TOTAL = $${total.toFixed(2)}`
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

const writeTxt = (info) => {
	const invoice = getInvoice()
	const contractor = openFile(getContractor())
	const company = openFile(getCompany())
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

	if (argv.a) txt += txtExpenses(Number(amount))
	writeFile(invoice, txt)
}

const parseLog = (filename) => {
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

	if (argv.o === "txt") writeTxt(info)
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
	parseLog(getLog())
}
if (argv.h) {
	showHelp()
}