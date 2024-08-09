# MyGVP - CLI Tool for Accessing Student Results from GVP College of Engineering

MyGVP is a Command Line Interface (CLI) tool designed to simplify the process of accessing student academic data from the result portal of GVP College of Engineering. With MyGVP, you can easily fetch URLs for student results based on batch year and semester, or directly retrieve results by providing the registration number.

## Features

- Directly retrieve results by providing the registration number.
- Simple and intuitive CLI interface.
- Fetch results URLs based on batch year and semester.

## Installation

You can install MyGVP globally using npm:

```bash
npm install -g mygvp
```

## Usage

### About

To  Display information about the mygvp project
```bash
mygvp info
```


### Fetch Results

To fetch results URL and result directly , use the following command:
```bash
mygvp <registration_number>
```
Replace `<registration_number>` with your registration_number.

Or you can enter your batch year also:
```bash
mygvp <registration_number> <batch_year>

```
Replace `<batch_year>` with your batch_year.
This works for lateral entries and other special cases.

For displaying all semester gpas of the user
```bash
mygvp <registration_number> -all

```
This will fetch the result data from the mygvp database.


## Contributing

Contributions are welcome! Feel free to submit bug reports, feature requests, or pull requests.

## Support

If you encounter any issues or need further assistance, please feel free to [open an issue](https://github.com/kumarram27/gvp/issues).