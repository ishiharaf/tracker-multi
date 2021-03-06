# tracker

Time tracker that calculates the number of hours worked in a day and outputs an invoice written in multiple languages. It acts like a time card stamped by a time clock. You can clock in and out for work and a break. For a fully-featured version check the [node](https://github.com/ishiharaf/tracker) version.

## Table of contents
- [Usage](#usage)
- [Options](#options)
- [Setup](#setup)
- [License](#license)

## Usage
Create a file inside the `hours` folder with the `MM-DD.log` naming scheme. Fill each line with the date and the hours. To add a comment, start the line with a `#`.

```log
2021/03/18 08:59:13 ~ 12:00:05 - 13:00:29 ~ 17:00:50
2021/03/18 08:58:21 ~ 12:00:37 - 13:00:59 ~ 17:01:41
# Woke up late today
2021/03/19 09:29:03 ~ 17:10:10
```

You can add the date and the hours manually, or add a snippet to your text editor. I type `addDate` to add the current date, and `addTime` to add the current time. This is my VSCode global snippets file:

```json
{
    "Insert current date": {
        "prefix": "addDate",
        "body": [
            "$CURRENT_YEAR/$CURRENT_MONTH/$CURRENT_DATE"
        ],
        "description": "Insert current date in YY/MM/DD format"
    },

    "Insert current time": {
        "prefix": "addTime",
        "body": [
            "$CURRENT_HOUR:$CURRENT_MINUTE:$CURRENT_SECOND"
        ],
        "description": "Insert current time in hh:mm:ss format"
    },
}
```

Change the contents of `contractor.info` to reflect your information, and `company.info` to reflect the company information. Run the app with `node app -w` and an invoice will appear inside the `invoices` folder.

You can pass additional arguments to change some details. To change the invoice or make other changes permanent, you have to edit the source code.

## Options
- `-h | --help` displays a help message.
- `-w | --write` includes additional expenses on the invoice.
- `-a | --add` writes an invoice.
- `-i | --input` takes a file as the input. The default is `MM-DD.log`.
- `-o | --output` changes the output format. The default is `txt`. It currently supports `txt` and `html`.
- `-d | --decimal` changes the hours on the invoice to decimal
- `-c | --company` changes the billed client. Pass the name without the `.info`. The default is `company`.
- `-r | --rate` changes the hourly rate. The default is `16`.

Long options are not available for every language. Currently available for `deno` and `python`.

## Setup

Move the file from the language you want to use from the `src` folder to the `usr` folder. Or you can move the sample files from the `usr` folder to another folder and move the source there as well.

### Python 3.10.0:b494f59

To run the app:
```bash
$ python app.py
```

### Node 14.12.0

To run the app:
```bash
$ node app
```

You need `parser.js` in order to run the app. I used [minimist](https://github.com/substack/minimist) (1.2.5) as the argument parser.

### Deno 1.14.1

To run the app:
```bash
$ deno run --allow-read --allow-write app.ts
```

To compile the app:
```bash
$ deno compile --allow-read --allow-write -o tracker app.ts
```

To change the target:
```bash
$ deno compile --allow-read --allow-write --target <TARGET> -o tracker app.ts
```

Possible targets:
```
x86_64-unknown-linux-gnu
x86_64-pc-windows-msvc
x86_64-apple-darwin
aarch64-apple-darwin
```

### PowerShell 5.1 Build 19041 Rev. 1237

To run the app:
```powershell
> ./App.ps1
```

Only long options are available for PowerShell. They are capitalized with a single dash. e.g.: `-Write` instead of `--write`. Since `$Input` is an internal variable on PowerShell, `--input` became `-File`. Use `-Help` for the full options.

## License
- See [LICENSE](LICENSE.md) file.