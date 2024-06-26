#!/usr/bin/env node
const { program } = require("commander");
const axios = require("axios");
const cheerio = require("cheerio");
const Table = require("cli-table3");
const urls = require("./links");
const inquirerPromise = import("inquirer");
const url = require("url");

// Function to fetch semester options based on batch year
async function fetchSemesterOptions(batchYear) {
  const inquirer = await inquirerPromise;
  const semesterOptions = {
    2020: [
      "Sem 1",
      "Sem 2",
      "Sem 3",
      "Sem 4",
      "Sem 5",
      "Sem 6",
      "Sem 7",
      "Sem 8",
    ],
    2021: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"],
    2022: ["Sem 1", "Sem 2", "Sem 3"],
    2023: ["Sem 1"],
    // Add more batch years and their corresponding semester options as needed
  };
  return semesterOptions[batchYear] || [];
}

// Function to prompt user to select semester
async function selectSemester(batchYear) {
  const inquirer = (await import("inquirer")).default;
  const semesterOptions = await fetchSemesterOptions(batchYear);
  // Prompt user to select a semester
  const { semester } = await inquirer.prompt([
    {
      type: "list",
      name: "semester",
      message: "Select a semester:",
      choices: semesterOptions,
    },
  ]);
  return semester;
}

// Function to extract batch year from registration number
function extractBatchYear(registrationNumber) {
  let batchYear = "";
  // Extracting batch year using regular expressions
  if (
    (/^20/.test(registrationNumber) && registrationNumber.length === 10) ||
    registrationNumber == 2020
  ) {
    batchYear = "2020";
  } else if (
    (/^21/.test(registrationNumber) && registrationNumber.length === 10) ||
    registrationNumber == 2021
  ) {
    batchYear = "2021";
  } else if (
    (/^322/.test(registrationNumber) && registrationNumber.length === 12) ||
    registrationNumber == 2022
  ) {
    batchYear = "2022";
  } else if (
    (/^323/.test(registrationNumber) && registrationNumber.length === 12) ||
    registrationNumber == 2023
  ) {
    batchYear = "2023";
  }
  return batchYear;
}

// Function to fetch result data using POST method with payload
async function fetchResultData(url, payload) {
  try {
    const response = await axios.post(url, payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching result data:", error);
    throw new Error("Error fetching result data:", error.message);
  }
}

// Function to parse HTML response and extract result
function parseResult(html, rollNoLength) {
  const $ = cheerio.load(html);
  const title = $("p[align='center'] font[size='4']").text().trim();
  let name = "";
  let Name = $("td[colspan='3']").text().trim();
  if (Name === "") {
    Name = $("td[colspan='4']").text().trim();
  }
  if (rollNoLength == 10) {
    name = Name.slice(10)
      .replace(/\d+\.\d+$/, "")
      .trim();
  } else if (rollNoLength == 12) {
    name = Name.slice(12)
      .replace(/\d+\.\d+$/, "")
      .trim();
  }
  const subjects = [];
  $("table[border='1'] tr").each((index, element) => {
    const $tds = $(element).find("td");
    if ($tds.length === 4 && $tds.eq(0).text().trim() !== "") {
      const subjectCodeAndName = $tds.eq(0).text().trim();
      const attendanceGrade = $tds.eq(1).text().trim();
      const performanceGrade = $tds.eq(2).text().trim();
      const credits = $tds.eq(3).text().trim();
      subjects.push({
        subjectCodeAndName,
        attendanceGrade,
        performanceGrade,
        credits,
      });
    }
  });

  // Extracting SGPA
  let sgpa = $("th:contains('SGPA')").next().text().trim();
  if (sgpa === "") {
    sgpa = $("td:contains('SGPA')").next().text().trim();
  }

  return { title, name, subjects, sgpa };
}

async function displayResultTable(result) {
  const chalk = (await import("chalk")).default;
  console.log("\t", chalk.red(result.title));
  console.log(`Name: ${chalk.blue(result.name)}`);

  const table = new Table({
    head: [
      chalk.yellow("Subject Code & Name"),
      chalk.yellow("Attendance Grade"),
      chalk.yellow("Performance Grade"),
      chalk.yellow("Credits"),
    ],
  });
  result.subjects.forEach((subject) => {
    if (
        subject.performanceGrade === "F" ||
        subject.performanceGrade === "Fail"
      ) {
        table.push([
          chalk.red(subject.subjectCodeAndName),
          chalk.red(subject.attendanceGrade),
          chalk.red(subject.performanceGrade),
          chalk.red(subject.credits),
        ]);
      } else {
        table.push([
          chalk.green(subject.subjectCodeAndName),
          chalk.green(subject.attendanceGrade),
          chalk.green(subject.performanceGrade),
          chalk.green(subject.credits),
        ]);
      }
  });
  console.log(`SGPA: ${chalk.cyan(result.sgpa)}`);
  console.log(table.toString());
}
async function getName(registrationNumber) {
  const rollNoLength = registrationNumber.length;
  const batchYear = extractBatchYear(registrationNumber);

  if (!batchYear) {
    console.error("Invalid registration number.");
    return;
  }

  const url = urls[batchYear] && urls[batchYear]["Sem 1"]; // Assuming we always take the first semester's URL
  const result = await getResults(
    registrationNumber,
    url,
    "Sem 1",
    rollNoLength,
    batchYear
  );

  if (result && result.name) {
    return result.name;
  } else {
    return null;
  }
}

async function getResult(registrationNumber) {
  const rollNoLength = registrationNumber.length;
  const batchYear = extractBatchYear(registrationNumber);
  const semester = await selectSemester(batchYear);
  const url = urls[batchYear] && urls[batchYear][semester];
  const result = await getResults(
    registrationNumber,
    url,
    semester,
    rollNoLength,
    batchYear
  );

  if (result) {
    displayResultTable(result);
  } else {
    return null;
  }
}

async function getResults(
  registrationNumber,
  url,
  semester,
  rollNoLength,
  batchYear
) {
  const { default: isOnline } = await import("is-online");
  const online = await isOnline();
  const chalk = (await import("chalk")).default;

  if (url) {
    if (!online) {
      console.log("Device is offline. Unable to fetch results.");
      console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
      return null;
    }

    if (rollNoLength === 4) {
      console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
      return null;
    }

    const parsedUrl = new URL(url);
    const semname = parsedUrl.searchParams.get("semname");
    const regulation = parsedUrl.searchParams.get("regulation");
    const semesterNo = parsedUrl.searchParams.get("semester");

    const constructEndpoint = (url) => {
      return url.replace("btechsearch.asp", "find_info.asp");
    };

    let endpoint;
    let payload;

    if (
      // batchYear === "2020" && (semester === "Sem 1" || semester === "Sem 2")
      url.includes("btechsearch.asp")
    ) {
      endpoint = constructEndpoint(url);
      payload = {
        u_input: registrationNumber,
        u_field: "state",
      };
    // } else if (batchYear === "2021" && semester === "Sem 1")
    //  {
    //   endpoint = constructEndpoint(url);
    //   payload = {
    //     u_input: registrationNumber,
    //     u_field: "state",
    //   };
    } else {
      endpoint = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults";
      payload = {
        input1: registrationNumber,
        hidedata: semname,
        hidedata2: regulation,
        hidedata3: semesterNo,
      };
    }

    const payloadString = new URLSearchParams(payload).toString();

    try {
      const resultData = await fetchResultData(endpoint, payloadString);
      const result = parseResult(resultData, rollNoLength);
      return result;
    } catch (error) {
      console.error("Error fetching or displaying results:", error);
      return null;
    }
  }
}
// Command to display information about mygvp
program
  .command("info")
  .description("Display information about the mygvp project")
  .action(() => {
    console.log(`
      🌟 Welcome to mygvp! 🚀

      This project helps you fetch and display your semester results in a colorful and efficient way. 
            
      Usage:
      command : mygvp <registration_number> 
      - To fetch your results, simply replace <registration_number> with your registration number.

      command : mygvp <batch_year>
      - You can also enter your batch year 
      (if you want to get result URLs even if you are online or if you are a lateral entry student)
      
      - For specific features, follow the prompts.

      Enjoy using mygvp! 🎉
    `);
  });

// CLI command for directly fetching results based on registration number
program
  .argument("<registration_number>")
  .option("-admin", "Access results with admin privileges")
  .description("Fetch results directly based on registration number")
  .action(async (registrationNumber, options) => {
    try {
      if (
        registrationNumber.length !== 10 &&
        registrationNumber.length !== 12 &&
        registrationNumber.length >= 5
      ) {
        console.error(
          "Invalid registration number. Please enter a valid registration number."
        );
        return;
      }
      if (registrationNumber.length === 4) {
        console.log("Fetching results for the batch:", registrationNumber);
        await getResult(registrationNumber);
        return;
      }
      const chalk = (await import("chalk")).default;
      if (
        registrationNumber === "21131a0527" ||
        registrationNumber === "21131A0527"
      ) {
        if (options.Admin) {
          admin = await getName(registrationNumber);
          console.log(`Hi, ${chalk.red("Admin")} ${chalk.green(admin)}!`);
          await getResult(registrationNumber);
          return;
        } else {
          console.log(chalk.red("Access denied. Admin privileges required."));
          return;
        }
      }
      user = await getName(registrationNumber);
      console.log(`Hi, ${chalk.green(user)}!`);
      await getResult(registrationNumber);
    } catch (error) {
      // console.error("Error:", error.message, error.response?.data);
      console.log("Error:", error.message);
    }
  });

program.parse(process.argv);