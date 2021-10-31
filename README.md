# tracker

Minimalistic time tracker. It calculates the number of hours worked in a day and outputs an invoice. It acts like a time card stamped by a time clock. You can clock in and out for work and a break. Written in multiple languages.

## Table of contents
- [Usage](#usage)
- [Options](#options)
- [Setup](#setup)
- [Changelog](#changelog)
- [License](#license)

## Setup
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

## License
- See [LICENSE](LICENSE.md) file.