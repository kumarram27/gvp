#!/usr/bin/env node
const { program } = require("commander");
const axios = require("axios");
const cheerio = require("cheerio");
const Table = require("cli-table3");
const urls = require("./links");
const inquirerPromise = import("inquirer");
const querystring = require("querystring");
const url = require("url");
// Function to fetch semester options based on batch year
async function fetchSemesterOptions(batchYear) {
  const inquirer = await inquirerPromise;
  // Mock data for demonstration purposes
  const semesterOptions = {
    2020: [
      "Sem 1",
      "Sem 2",
      "Sem 3",
      "Sem 4",
      "Sem 5",
      "Sem 6",
      "Sem 7",
      "Sem 8"
    ],
    2021: [
      "Sem 1",
      "Sem 2",
      "Sem 3",
      "Sem 4",
      "Sem 5",
      "Sem 6"
    ],
    2022: ["Sem 1", "Sem 2", "Sem 3"],
    2023: ["Sem 1"],
    // Add more batch years and their corresponding semester options as needed
  };

  return semesterOptions[batchYear] || [];
}
// const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// function getRegulation(batchYear) {
//   console.log("Batch Year:", batchYear); // Add this line to check the batch year
//   if (batchYear == 2021) {
//     return "R-2020";
//   } else if (batchYear == 2022 || batchYear == 2023) {
//     return "R-2022"; // For both 2022 and 2023
//   } else {
//     // Handle other batch years if needed
//     return null; // or throw an error
//   }
// }

// async function getURL(batchYear, semester) {
//   const baseURL = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults.jsp";
//   const regulation = getRegulation(batchYear);
//   const semesterNo = semester.replace("Sem ", "");

//   // Get the Roman numeral representation of the semester
//   const semesterNumber = romanNumerals[parseInt(semesterNo, 10) - 1];

//   // Define the dynamic part of the URL
//   const dynamicParams = `semname=B.%20Tech.%20${semesterNumber}%20Semester%20(${regulation})%20(For%20${batchYear}%20Admitted%20Batches)%20Regular%20Examination%20Results,%20`;

//   // Construct the full URL
//   const url = `${baseURL}?${dynamicParams}&regulation=${regulation}&semester=${semesterNo}`;

//   return url;
// }

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


// program.argument("<batch_year>").action(async (batchYear) => {
//   const semester = await selectSemester(batchYear);

//   const url = urls[batchYear] && urls[batchYear][semester];

//   if (url) {
//     console.log(`URL for ${semester} results: ${url}`);
//   } else {
//     console.log("URL not found for the selected batch year and semester.");
//   }
// });

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


// CLI command for directly fetching results based on registration number
program
  .argument("<registration_number>")
  .description("Fetch results directly based on registration number")
  .action(async (registrationNumber) => {
    try {
      console.log(
        "Fetching results for registration number:",
        registrationNumber
      );
      const rollNoLength = registrationNumber.length; // Define rollNoLength here
      // Extract batch year from registration number using regex
      const batchYear = extractBatchYear(registrationNumber);

      // Select semester
      semester = await selectSemester(batchYear); 

      // Fetch result URL
      const url = urls[batchYear] && urls[batchYear][semester];
      console.log(`URL for ${semester} results: ${url}\n\n`);
      // Adjust the payload and the endpoint for the POST request
      const urlString = url;
      const parsedUrl = new URL(urlString);

      const semname = parsedUrl.searchParams.get("semname");
      const regulation = parsedUrl.searchParams.get("regulation");
      // const lastdaterev = parsedUrl.searchParams.get("lastdaterev");
      const semesterNo = parsedUrl.searchParams.get("semester");

      console.log(semname);
      // console.log("Regulation:", regulation);
      console.log("Semester:", semesterNo);
      // console.log("Last date for Revaluation:", lastdaterev);

      const payload = {
        input1: registrationNumber,
        // u_field: "Regd.No.",
        hidedata: semname,
        // hidedata1: "03-05-2023",
        hidedata2: regulation,
        hidedata3: semesterNo,
      };

      const payloadString = querystring.stringify(payload);

      const endpoint = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults";

      // Fetch result data
      if (url) {
        const resultData = await fetchResultData(endpoint, payloadString);
        const result = parseResult(resultData, rollNoLength); // Pass rollNoLength to parseResult
        displayResultTable(result);
      } else {
        console.log("URL not found for the selected batch year and semester.");
      }
    } catch (error) {
      console.error("Error:", error.message, error.response?.data);
    }
  });

// Function to parse HTML response and extract result
function parseResult(html, rollNoLength) {
  const $ = cheerio.load(html);
  // Extracting name
  let name = "";
  const Name = $("td[colspan='3']").text().trim();
  if (rollNoLength == 10) {
    name = Name.slice(10).replace(/\d+\.\d+$/, "").trim(); // Remove SGPA from name
  } else if (rollNoLength == 12) {
    name = Name.slice(12).replace(/\d+\.\d+$/, "").trim(); // Remove SGPA from name
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


// Function to display result in a table
function displayResultTable(result) {
  // Print student's name and roll number
  console.log(`Name: ${result.name}`);

  const table = new Table({
    head: ["Subject", "Attendance Grade", "Performance Grade", "Credits"],
  });

  result.subjects.forEach((subject) => {
    table.push([
      subject.subjectCodeAndName,
      subject.attendanceGrade,
      subject.performanceGrade,
      subject.credits,
    ]);
  });
  console.log(`SGPA: ${result.sgpa}`);
  // Print table for subjects
  console.log(table.toString());
}
program.parse(process.argv);
