#!/usr/bin/python

import sys
from math import floor
from os import path
from getopt import getopt
from getopt import GetoptError
from datetime import datetime, timedelta

def openFile(filename):
	try:
		with open(filename, "r") as file:
			data = file.read()
	except IOError as err:
		print(f"{err}\n")
		sys.exit(2)
	return data

def writeFile(filename, data):
	try:
		with open(filename, "w") as file:
			file.write(data)
	except IOError as err:
		print(f"{err}\n")
		sys.exit(2)

def filterLine(line):
	match = ["~", "-"]
	return list(filter(lambda x: x not in match, line.split()))

def getYear(date):
	return date.strftime("%Y")

def getMonth(date):
	return date.strftime("%m")

def getDate(date):
	return date.strftime("%d")

def getHours(time):
	hours = floor(time.total_seconds() / 60 / 60)
	minutes = floor((time.total_seconds() / 60) % 60)
	return f"{hours:02}:{minutes:02}"

def getHoursDec(time):
	hours = time.total_seconds() / 60 / 60
	return f"{hours:05.2f}"

def getHtml():
	file = "invoice.html"
	folder = "templates"
	return path.join(folder, file)

def getInvoice():
	file = f"{path.splitext(path.basename(args['i']))[0]}.{args['o']}"
	folder = "invoices"
	return path.join(folder, file)

def getExpenses():
	file = f"{path.splitext(path.basename(args['i']))[0]}.log"
	folder = "expenses"
	return path.join(folder, file)

def getName(date):
	return f"{getYear(date)}-{getMonth(date)}"

def getLog():
	file = f"{path.splitext(path.basename(args['i']))[0]}.log"
	folder = "hours"
	return path.join(folder, file)

def getTimeDiff(start, end):
	return end - start

def getBillableTime(line):
	entry = filterLine(line)
	date = entry[0]
	hours = entry[1:]
	billable = timedelta(seconds=0)
	for i in range(0, len(hours), 2):
		start = datetime.strptime(f"{date} {hours[i]}", "%Y/%m/%d %H:%M:%S")
		end = datetime.strptime(f"{date} {hours[i + 1]}", "%Y/%m/%d %H:%M:%S")
		if end < start:
			end = end + timedelta(days=1)
		billable += getTimeDiff(start, end)
	return billable

def getAmount(time, rate):
	amount = float(time) * rate
	return f"{amount:.2f}"

def getCompany():
	file = f"{args['c']}.info"
	folder = "info"
	return path.join(folder, file)

def getContractor():
	file = "contractor.info"
	folder = "info"
	return path.join(folder, file)

def txtExpenses(amount):
	file = openFile(getExpenses()).splitlines()
	expenses = ""
	subtotal = 0
	for i in range(len(file)):
		line = file[i]
		if line[0] != "#":
			entry = line.split()
			expense = float(entry[-1])
			del entry[-1]
			item = f"{' '.join(entry[1:])} = {expense:.2f}\n"
			expenses += item
			subtotal += expense
	total = amount + subtotal
	txt = (f"\n\nADDITIONAL EXPENSES\n"
		   f"{expenses}\n"
		   f"  SUBTOTAL = ${subtotal:.2f}\n"
		   f"     TOTAL = ${total:.2f}")
	return txt

def txtHours(log):
	result = ""
	for i in range(len(log)):
		line = log[i].split()
		date = line[0]
		time = datetime.strptime(line[1], "%H:%M:%S")
		delta = timedelta(hours=time.hour, minutes=time.minute, seconds=time.second)
		hours = getHoursDec(delta) if args["d"] else getHours(delta)
		rate = args["r"]
		amount = getAmount(getHoursDec(delta), rate)
		result += f"{date} > {hours} x ${rate} = ${amount}\n"
	return result

def writeTxt(info):
	invoice = getInvoice()
	contractor = openFile(getContractor())
	company = openFile(getCompany())
	time = info["billable"]
	hours = getHoursDec(time) if args["d"] else getHours(time)
	rate = args["r"]
	amount = getAmount(getHoursDec(time), rate)
	now = datetime.now()
	txt = (f"INVOICE #{getYear(now)}{getMonth(now)}{getDate(now)}\n"
		   f"{getYear(now)}/{getMonth(now)}/{getDate(now)}\n\n"
		   f"SENDER\n"
		   f"{contractor}\n\n"
		   f"RECIPIENT\n"
		   f"{company}\n\n"
		   f"DATE         HOURS   RATE   AMOUNT\n"
		   f"{txtHours(info['log'])}\n"
		   f"     HOURS = {hours}\n"
		   f"    AMOUNT = ${amount}")
	if args["a"]:
		txt += txtExpenses(float(amount))
	writeFile(invoice, txt)

def htmlExpenses(amount):
	file = openFile(getExpenses()).splitlines()
	subtotal = 0
	html = """
	<div id="additionalExpenses" class="header" style="margin-top: 3rem;">
		<div class="separator"></div>
		<div class="item"><p>Date</p></div>
		<div class="item"><p>Misc. Expenses</p></div>
		<div class="item"><p></p></div>
		<div class="amount end"><p>Amount</p></div>
	</div>
	<div id="log">"""
	for i in range(len(file)):
		line = file[i]
		if line[0] != "#":
			entry = line.split()
			date = entry[0]
			expense = float(entry[-1])
			del entry[-1]
			item = f"{' '.join(entry[1:])}"
			div = f"""
		<div class="day">
			<div class="item">{date}</div>
			<div class="item" style="flex-basis: 60%;">{item}</div>
			<div class="amount end">${expense:.2f}</div>
		</div>"""
			html += div
			subtotal += expense
	total = amount + subtotal
	html += f"""
	</div>
	<div class="total">
		<div><b>Subtotal</b></div>
		<div class="end">${subtotal:.2f}</div>
	</div>
	<div class="total">
		<div><b>Total</b></div>
		<div class="end">${total:.2f}</div>
	</div>"""
	return html

def htmlHours(log):
	html = ""
	for i in range(len(log)):
		line = log[i].split()
		date = line[0]
		time = datetime.strptime(line[1], "%H:%M:%S")
		delta = timedelta(hours=time.hour, minutes=time.minute, seconds=time.second)
		hours = getHoursDec(delta) if args["d"] else getHours(delta)
		rate = args["r"]
		amount = getAmount(getHoursDec(delta), rate)
		div = f"""
		<div class="day">
			<div class="item">${date}</div>
			<div class="item">${hours}</div>
			<div class="item">$${rate}</div>
			<div class="amount end">$${amount}</div>
		</div>"""
		html += div
	return html

def writeHtml(info):
	invoice = getInvoice()
	contractor = openFile(getContractor())
	company = openFile(getCompany())
	template = openFile(getHtml())
	position = template.index("<body>") + 6
	time = info["billable"]
	hours = getHoursDec(time) if args["d"] else getHours(time)
	rate = args["r"]
	amount = getAmount(getHoursDec(time), rate)
	now = datetime.now()
	content = f"""
	<div id="title">Invoice #{getYear(now)}{getMonth(now)}{getDate(now)}</div>
	<div id="subtitle">{getYear(now)}/{getMonth(now)}/{getDate(now)}</div>
	<div class="divisor"></div>
	<div id="info" class="header">
		<div class="item">
			<p>Sender</p>
			<div>{contractor}</div>
		</div>
		<div class="item">
			<p>Recipient</p>
			<div>{company}</div>
		</div>
	</div>
	<div id="expenses" class="header">
		<div class="separator"></div>
		<div class="item"><p>Date</p></div>
		<div class="item"><p>Hours</p></div>
		<div class="item"><p>Rate</p></div>
		<div class="amount end"><p>Amount</p></div>
	</div>
	<div id="log">{htmlHours(info["log"])}
	</div>
	<div class="total">
		<div><b>Total Hours</b></div>
		<div class="end">{hours}</div>
	</div>
	<div class="total">
		<div><b>Total Amount</b></div>
		<div class="end">${amount}</div>
	</div>"""

	html = template[0:position] + content
	if args["a"]:
		html += htmlExpenses(float(amount))
	html += template[:position]
	writeFile(invoice, html)

def parseLog(filename):
	lines = openFile(filename).splitlines()
	totalBillable = timedelta(seconds=0)
	log = []
	for i in range(len(lines)):
		line = lines[i]
		if line[0] != "#":
			billable = getBillableTime(line)
			date = line[0:10]

			totalBillable += billable
			log.append(f"{date} {billable}")
	info = {
		"billable": totalBillable,
		"log": log
	}
	if args["o"] == "txt":
		writeTxt(info)
	if args["o"] == "html":
		writeHtml(info)

def showHelp():
	print('"-h | --help" displays this message')
	print('"-w | --write" writes an invoice.')
	print('"-a | --add" includes additional expenses on the invoice')
	print('"-i | --input" takes a file as the input. Default is "MM-DD.log"')
	print('"-o | --output" changes the output format. Default is "txt". It currently supports "txt" and "html"')
	print('"-d | --decimal" changes the hours on the invoice to decimal')
	print('"-c | --company" changes the billed client. Pass the name without the ".info". Default is "company"')
	print('"-r | --rate" changes the hourly rate. Default is "16"')

def parseArgs():
	arguments = {
		"w": False,
		"i": getName(datetime.now()),
		"o": "txt",
		"c": "company",
		"h": False,
		"d": False,
		"a": False,
		"r": 16
	}
	try:
		opts, args = getopt(
			sys.argv[1:],
			"wi:o:c:hdar:",
			[
				"write",
				"input=",
				"output=",
				"company=",
				"help",
				"decimal",
				"add",
				"rate="
			]
		)
		for opt, arg in opts:
			if opt in ["-w", "--write"]:
				arguments["w"] = True
			elif opt in ["-i", "--input"]:
				arguments["i"] = arg
			elif opt in ["-o", "--output"]:
				arguments["o"] = arg
			elif opt in ["-c", "--company"]:
				arguments["c"] = arg
			elif opt in ["-h", "--help"]:
				arguments["h"] = True
			elif opt in ["-d", "--decimal"]:
				arguments["d"] = True
			elif opt in ["-a", "--add"]:
				arguments["a"] = True
			elif opt in ["-r", "--rate"]:
				arguments["r"] = arg
			else:
				assert False, "Invalid option"
	except GetoptError as err:
		print(f"{err}\n")
		showHelp()
		sys.exit(2)
	return arguments

args = parseArgs()
if args["w"]:
	parseLog(getLog())
if args["h"]:
	showHelp()