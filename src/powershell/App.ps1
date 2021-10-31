Param (
	[switch]$Write = $false,
	[string]$File = (Get-Date -Format "yyyy-MM"),
	[string]$Output = "txt",
	[string]$Company = "company",
	[switch]$Help = $false,
	[switch]$Decimal = $false,
	[switch]$Add = $false,
	[int]$Rate = 16
)

Function Open-File ([string]$FileName) {
	Return Get-Content -Path $FileName -Raw
}

Function Write-File ([string]$FileName, [string]$Data) {
	Set-Content -Path $FileName -Value $Data
}

Function Get-Company {
	$FileName = "$($Company).info"
	$Folder = "info"
	Return [IO.Path]::Combine($Folder, $FileName)
}
Function Get-Contractor {
	$FileName = "contractor.info"
	$Folder = "info"
	Return [IO.Path]::Combine($Folder, $FileName)
}

Function Get-Invoice {
	$FileName = If ($File.Contains($Output)) {$File} Else {"$($File).$($Output)"}
	$Folder = "invoices"
	Return [IO.Path]::Combine($Folder, $FileName)
}

Function Get-Log {
	$FileName = If ($File.Contains(".log")) {$File} Else {"$($File).log"}
	$Folder = "hours"
	Return [IO.Path]::Combine($Folder, $FileName)
}

Function Get-Expenses {
	$FileName = If ($File.Contains(".log")) {$File} Else {"$($File).log"}
	$Folder = "expenses"
	Return [IO.Path]::Combine($Folder, $FileName)
}

Function Get-Hours ([TimeSpan] $Time) {
	$Hours = [Math]::Floor($Time.TotalMinutes / 60).ToString("00")
	$Minutes = [Math]::Floor($Time.TotalMinutes % 60).ToString("00")
	Return "$($Hours):$($Minutes)"
}

Function Get-HoursDecimal ([TimeSpan] $Time) {
	$Hours = ($Time.TotalMinutes / 60).ToString("00.00")
	Return $Hours
}

Function Filter-Line ([string] $Line) {
	$Filter = @("-", "~")
	$Array = $Line.Split()
	Return @($Array) | Select-String -Pattern $Filter -simplematch -notmatch
}

Function Split-Lines ($Lines) {
	Return $Lines.Split([Environment]::NewLine, [StringSplitOptions]::RemoveEmptyEntries)
}

Function Get-TimeDiff ([DateTime]$Start, [DateTime]$End) {
	Return New-TimeSpan $Start $End
}

Function Get-BillableTime ([string] $Line) {
	$Entry = Filter-Line $Line
	$Date = $Entry[0]
	$Null, $Entry = $Entry
	$Billable = New-TimeSpan

	For ($i = 0; $i -lt $Entry.Count; $i += 2) {
		$Start = [DateTime]"$($Date) $($Entry[$i])"
		$End = [DateTime]"$($Date) $($Entry[$i + 1])"

		If ($End -lt $Start) {
			$End.AddDays(1)
		}
		$Billable += Get-TimeDiff $Start $End
	}
	Return $Billable
}

Function Get-Amount ([float]$Time, [int]$Rate) {
	$Amount = $Time * $Rate
	Return $Amount.ToString("f")
}

Function Get-TextExpenses ([int] $Amount) {
	$Log = Open-File (Get-Expenses)
	$Text = ""
	$Subtotal = 0
	$NewLine = [Environment]::NewLine
	$Lines = Split-Lines $Log
	ForEach ($Line in $Lines) {
		If ($Line.Substring(0, 1) -ne "#") {
			$Str = $Line.Split()
			$Expense = [float]$Str[-1]
			$Null, $Str = $Str | Where-Object {$_ -ne $Str[-1]}
			$Text += "$($Str -Join ' ') = `$$($Expense.ToString('#.00')){0}" -f $NewLine
			$Subtotal += $Expense
		}
	}
	$Total = $Amount + $Subtotal
	$Result = "{0}{0}ADDITIONAL EXPENSES{0}" -f $NewLine
	$Result += "$($Text){0}" -f $NewLine
	$Result += "  SUBTOTAL = `$$($Subtotal.ToString('#.00')){0}" -f $NewLine
	$Result += "     TOTAL = `$$($Total.ToString('#.00'))"
	Return $Result
}

Function Get-TextHours ($Log) {
	$Result = ""
	ForEach ($Entry in $Log) {
		$Line = $Entry.Split()
		$Date = $Line[0]
		$Time = $Line[1]
		$Hours = If ($Decimal) {Get-HoursDecimal $Time} Else {Get-Hours $Time}
		$Amount = Get-Amount (Get-HoursDecimal $Time) $Rate
		$NewLine = [Environment]::NewLine
		$Result += "$($Date) > $($Hours) x `$$($Rate) = `$$($Amount){0}" -f $NewLine
	}
	Return $Result
}

Function Write-Text ($Info) {
	$Invoice = Get-Invoice
	$ContractorInfo = Open-File (Get-Contractor)
	$CompanyInfo = Open-File (Get-Company)
	$Time = $Info.Billable
	$Hours = If ($Decimal) {Get-HoursDecimal $Time} Else {Get-Hours $Time}
	$Amount = Get-Amount (Get-HoursDecimal $Time) $Rate
	$NewLine = [Environment]::NewLine
	$Text =  "INVOICE #$(Get-Date -Format 'yyyyMMdd'){0}" -f $NewLine
	$Text += "$(Get-Date -Format 'yyyy/MM/dd'){0}{0}" -f $NewLine
	$Text += "SENDER{0}" -f $NewLine
	$Text += "$($ContractorInfo){0}{0}" -f $NewLine
	$Text += "RECIPIENT{0}" -f $NewLine
	$Text += "$($CompanyInfo){0}{0}" -f $NewLine
	$Text += "DATE         HOURS   RATE   AMOUNT{0}" -f $NewLine
	$Text += "$(Get-TextHours $Info.Log){0}" -f $NewLine
	$Text += "     HOURS = $($Hours){0}" -f $NewLine
	$Text += "    AMOUNT = $($Amount)"

	If ($Add) {
		$Text += Get-TextExpenses $Amount
	}
	Write-File $Invoice $Text
}

Function Parse-Log ([string] $FileName) {
	$Data = Open-File $FileName
	$TotalBillable = New-TimeSpan
	$Log = @()
	$Lines = Split-Lines $Data
	ForEach ($Line in $Lines) {
		If ($Line.Substring(0, 1) -ne "#") {
			$Billable = Get-BillableTime $Line
			$Date = $Line.Substring(0, 10)
			$TotalBillable += $Billable
			$Log += "$($Date) $($Billable)"
		}
	}
	$Info = @{
		Billable = $TotalBillable;
		Log = $Log;
	}
	If ($Output -eq "txt") {
		Write-Text $Info
	}
}

Function Show-Help {
	Write-Host '"-Help" displays this message'
	Write-Host '"-Write" writes an invoice.'
	Write-Host '"-Add" includes additional expenses on the invoice'
	Write-Host '"-Input" takes a file as the input. Default is "MM-DD.log"'
	Write-Host '"-Output" changes the output format. Default is "txt". It currently supports "txt" and "html"'
	Write-Host '"-Decimal" changes the hours on the invoice to decimal'
	Write-Host '"-Company" changes the billed client. Pass the name without the ".info". Default is "company"'
	Write-Host '"-Rate" changes the hourly rate. Default is "16"'
}

If ($Write) {
	Parse-Log (Get-Log)
}
If ($Help) {
	Show-Help
}