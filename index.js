#!/usr/bin/env node
const { program } = require("commander");
const urls = require("./links");
// Use dynamic import to import inquirer
const inquirerPromise = import("inquirer");

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


program.argument("<batch_year>").action(async (batchYear) => {
  const semester = await selectSemester(batchYear);

  const url = urls[batchYear] && urls[batchYear][semester];

  if (url) {
    console.log(`URL for ${semester} results: ${url}`);
  } else {
    console.log("URL not found for the selected batch year and semester.");
  }
});

program.parse(process.argv);
