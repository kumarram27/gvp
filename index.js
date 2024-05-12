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
    2020: ["Sem 1","Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6","Sem 7","Sem 8" ],
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
  if (/^21/.test(registrationNumber)) {
    batchYear = "2021";
  } else if (/^20/.test(registrationNumber)) {
    batchYear = "2020";
  } else if (/^322/.test(registrationNumber)) {
    batchYear = "2022";
  } else if (/^323/.test(registrationNumber)) {
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
  // Extracting name
  let name = "";
  const Name = $("td[colspan='3']").text().trim();
  if (rollNoLength == 10) {
    name = Name.slice(10)
      .replace(/\d+\.\d+$/, "")
      .trim(); // Remove SGPA from name
  } else if (rollNoLength == 12) {
    name = Name.slice(12)
      .replace(/\d+\.\d+$/, "")
      .trim(); // Remove SGPA from name
  }

  // Extracting subjects
  const subjects = [];
  $("table[border='1'] tr:gt(2)").each((index, element) => {
    const $tds = $(element).find("td");
    if ($tds.length === 4) {
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
  const sgpa = $("th:contains('SGPA')").next().text().trim();

  return { name, subjects, sgpa };
}

async function displayResultTable(result) {
  const chalk = (await import("chalk")).default;
  console.log(`Name: ${chalk.blue(result.name)}`);

  const table = new Table({
    head: [
      chalk.yellow("Subject"),
      chalk.yellow("Attendance Grade"),
      chalk.yellow("Performance Grade"),
      chalk.yellow("Credits"),
    ],
  });

  result.subjects.forEach((subject) => {
    if (subject.performanceGrade === "F" || subject.performanceGrade === "Fail") {
      table.push([
        chalk.red(subject.subjectCodeAndName),
        chalk.red(subject.attendanceGrade),
        chalk.red(subject.performanceGrade),
        chalk.red(subject.credits),
      ]);
    }else {
      table.push([
        chalk.green(subject.subjectCodeAndName),
        chalk.green(subject.attendanceGrade),
        chalk.green(subject.performanceGrade),
        chalk.green(subject.credits),
      ]);
    }
    
  });

  console.log(`SGPA: ${chalk.cyan(result.sgpa)}`);
  // Print table for subjects
  console.log(table.toString());
}



async function getResult(registrationNumber) {
  const rollNoLength = registrationNumber.length; // Define rollNoLength here
  // Extract batch year from registration number using regex
  const batchYear = extractBatchYear(registrationNumber);

  // Select semester
  semester = await selectSemester(batchYear);
  // Fetch result URL
  const url = urls[batchYear] && urls[batchYear][semester];
  const { default: isOnline } = await import("is-online");
  const online = await isOnline();
  const chalk = (await import("chalk")).default;
  if (!online) {
    console.log("Device is offline. Unable to fetch results.");
    console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
    return;
  }
  if(batchYear === "2020" && semester === "Sem 1" || semester === "Sem 2"){
    console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
    return;
  }
  // Adjust the payload and the endpoint for the POST request
  const urlString = url;
  const parsedUrl = new URL(urlString);
  
  const semname = parsedUrl.searchParams.get("semname");
  const regulation = parsedUrl.searchParams.get("regulation");
  // const lastdaterev = parsedUrl.searchParams.get("lastdaterev");
  const semesterNo = parsedUrl.searchParams.get("semester");

  
  console.log("\t",chalk.red(semname));
  // console.log("Regulation:", regulation);
  // console.log("Semester:", semesterNo);
  // console.log("Last date for Revaluation:", lastdaterev);

  const payload = {
    input1: registrationNumber,
    // u_field: "Regd.No.",
    hidedata: semname,
    // hidedata1: "03-05-2023",
    hidedata2: regulation,
    hidedata3: semesterNo,
  };

  const payloadString = new URLSearchParams(payload).toString();

  const endpoint = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults";

  // Fetch result data
  if (url) {
    const resultData = await fetchResultData(endpoint, payloadString);
    const result = parseResult(resultData, rollNoLength); // Pass rollNoLength to parseResult
    displayResultTable(result);
  } else {
    console.log("URL not found for the selected semester.");
  }
}

// CLI command for directly fetching results based on registration number
program
  .argument("<registration_number>")
  .option("-admin", "Access results with admin privileges")
  .description("Fetch results directly based on registration number")
  .action(async (registrationNumber, options) => {
    try {
      const chalk = (await import("chalk")).default;
      if (registrationNumber === "21131a0527") {
        if (options.Admin) {
          console.log( "Fetching results with admin privileges for registration number:", chalk.green(registrationNumber));
          await getResult(registrationNumber);
          return;
        } else {
          console.log(chalk.red("Naa Saavu Nenu Sastha Neekenduku"));
          return;
        }
      }
      console.log("Fetching results for registration number:",  chalk.green(registrationNumber));
      await getResult(registrationNumber);
    } catch (error) {
      console.error("Error:", error.message, error.response?.data);
    }
  });

program.parse(process.argv);
