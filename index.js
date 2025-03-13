#!/usr/bin/env node
const { program } = require("commander");
const axios = require("axios");
const cheerio = require("cheerio");
const Table = require("cli-table3");
const urls = require("./links");
const inquirerPromise = import("inquirer");
require("dotenv").config();


// let adminNumbers = [];
// try {
//   const config = require("./config.json");
//   adminNumbers = config.adminRegistrationNumbers || [];
// } catch (error) {
//   console.warn("Configuration file not found. Using default settings.");
// }
const adminNumber = process.env.ADMIN_REGISTRATION_NUMBER;
const server = process.env.SERVER_URL || "https://mygvp-db.onrender.com";
// Function to fetch semester options based on batch year
async function fetchSemesterOptions(batchYear) {
  const inquirer = await inquirerPromise;
  const semesterOptions = {
    2021: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7"],
    2022: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5"],
    2023: ["Sem 1","Sem 2", "Sem 3"],
    2024: ["Sem 1"],

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
  let registration_number = registrationNumber.toUpperCase();
  if (registration_number.includes("A")) return "2021";

  const match = registrationNumber.match(/^.(\d{2})/);
  if (match) return `20${match[1]}`;

  return "2021";
}

// Function to fetch result data using POST method with payload
async function fetchResultData(url, payload) {
  try {
    const response = await axios.post(url, payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching result data",);
    throw new Error("Error fetching result data",error);
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
    if ($tds.length === 4 && $tds.eq(0).text().trim() !== "" && $tds.eq(0).text().trim() !== "Subject Code & Name"){
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
async function getName(registrationNumber, effectiveBatchYear) {
  const { default: isOnline } = await import("is-online");
  const online = await isOnline();

  if (online) {
    try {
      const rollNoLength = registrationNumber.length;
      const batchYear = effectiveBatchYear;
      if (!batchYear) {
        console.error("Invalid registration number. ");
        console.log("try mygvp <your_registration_no> <Batch_year> command")
        return;
      }

      const url = urls[batchYear] && (urls[batchYear]["Sem 3"] || urls[batchYear]["Sem 1"]); // 
      if (!url) {
        console.error(`No URL found for batch year ${batchYear}`);
        return;
      }

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
        console.error("No result found for the given registration number.");
        return null;
      }
    } catch (error) {
      console.error("Error in getName:", error.message);
      return null;
    }
  } else {
    console.log("Device is offline");
    return `user ${registrationNumber}`;
  }
}


async function getResult(registrationNumber ,effectiveBatchYear) {
  const rollNoLength = registrationNumber.length;
  const batchYear = effectiveBatchYear;
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
    let res = { [semester]: result.sgpa };

    await axios.post(`${server}/api/save-gpa`, {
      registrationNumber: registrationNumber.toUpperCase(),
      name: result.name,
      gpas: res,
    });
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
      console.error("Device is offline. Unable to fetch results.");
      console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
      return null;
    }

    if (rollNoLength === 4) {
      console.log(`URL for ${semester} results: "${chalk.blue(url)}"\n`);
      return null;
    }

    const parsedUrl = new URL(url);
    const fileName = parsedUrl.searchParams.get("fileName");
    const regulation = parsedUrl.searchParams.get("regulation");
    const semester = parsedUrl.searchParams.get("semester");
    const revaluationDate = parsedUrl.searchParams.get("revaluationDate");
    const type = parsedUrl.searchParams.get("type");

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
      endpoint = "http://gvpce.ac.in:10000/GVP%20Results/gvpResults";
      payload = {
        number: registrationNumber,
        fileName: fileName,
        regulation: regulation,
        semester: semester,
        revaluationDate: revaluationDate,
        type: type,
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

      command : mygvp <registration_number> <batch_year>
      - Replace <batch_year> with your batch_year.This works for lateral entries and other special cases.

      command : mygvp <registration_number> -all
      - To display all the GPAs of the given registration number.

      Enjoy using mygvp! 🎉
    `);
  });

program
  .argument("<registration_number>")
  .argument("[batch_year]", "Optional batch year for special cases")
  .option("-admin", "Access results with admin privileges")
  .option("-all", "Display All GPAs")
  .description("Fetch results directly based on registration number")
  .action(async (registrationNumber, batchYear, options) => {
    try {
      // Validate registration number length
      if (
        registrationNumber.length !== 10 &&
        registrationNumber.length !== 12
      ) {
        console.error(
          "Invalid registration number. Please enter a valid registration number."
        );
        return;
      }

      const chalk = (await import("chalk")).default;
      if (options.All) {
        try {
          if (registrationNumber.toUpperCase() != adminNumber) {
            const response = await axios.get(
              `${
                process.env.SERVER_URL || server || "https://mygvp-db.onrender.com"
              }/api/get-gpa/${registrationNumber.toUpperCase()}`
            );
            const data = response.data;
            if (data) {
              console.log(`Hi ${chalk.green(data.name)}!`);
              console.log(data.gpas);
            }
          } else {
            if (options.Admin) {
              const response = await axios.get(
                `${
                  process.env.SERVER_URL || server || "https://mygvp-db.onrender.com"
                }/api/get-gpa/${adminNumber}`
              );
              const data = response.data;
              if (data) {
                console.log(`Hi ${chalk.red(data.name)}!`);
                console.log(data.gpas);
              }
            }
          }
          return;
        } catch (error) {
          console.error("Error retrieving GPA data from mygvp database."
            // , error
          );
        }
      }

      // Check for admin access
      if (registrationNumber.toUpperCase() == adminNumber) {
        if (options.Admin) {
          const effectiveBatchYear =
            batchYear || extractBatchYear(registrationNumber);
          admin = await getName(registrationNumber, effectiveBatchYear);
          console.log(`Hi, ${chalk.red("Admin")} ${chalk.green(admin)}!`);
          await getResult(registrationNumber, effectiveBatchYear);
          return;
        } else {
          console.log(chalk.red("Access denied. Admin privileges required."));
          return;
        }
      }

      // Determine the effective batch year
      const effectiveBatchYear =
        batchYear || extractBatchYear(registrationNumber);

      // Fetch user info
      user = await getName(registrationNumber.toUpperCase(), effectiveBatchYear);
      if (!user) {
        console.error("Could not fetch user information.");
        return;
      }

      console.log(`Hi, ${chalk.green(user)}!`);

      // Fetch and display results
      await getResult(registrationNumber.toUpperCase(), effectiveBatchYear);
    } catch (error) {
      console.error("Error:", error.message);
    }
  });

program.parse(process.argv);