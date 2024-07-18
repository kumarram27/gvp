from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options  # Import Options class
from bs4 import BeautifulSoup
import time

def scrape_results(registration_number):
    url = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults.jsp?semname=B.%20Tech.%20IV%20Semester%20(R-2020)%20(For%202021%20Admitted%20Batches)%20Regular%20Examination%20Results,%20June-2023&regulation=R-2020&semester=4&lastdaterev=27-09-2023"  # Replace with the actual URL

    # Use Selenium to automate browser interaction in headless mode
    options = Options()
    options.add_argument('--headless')  # Run Chrome in headless mode
    driver = webdriver.Chrome(options=options)  # Use the Options instance

    driver.get(url)

    # Fill in the form
    input_field = driver.find_element(By.NAME, "input1")
    input_field.send_keys(registration_number)
    input_field.send_keys(Keys.RETURN)

    # Wait for the page to load (you might need to adjust the sleep duration)
    time.sleep(5)

    # Get the HTML content after form submission
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    # Find the element containing registration number and name
    reg_no_name_element = soup.find('td', {'colspan': '3'})

    # Check if the element exists
    if reg_no_name_element:
        # Extract relevant information
        reg_no = reg_no_name_element.text.strip()
        name = reg_no_name_element.find_next('td').text.strip()
        subjects = soup.find_all('td', {'align': 'center'})

        # Display the extracted information
        print(f"Regd.No: {reg_no}")
        print(f"Name: {name}")

        # Extract and display subject details
        for i in range(0, len(subjects), 3):
            # Check if there are enough elements remaining in the subjects list
            if i + 2 < len(subjects):
                subject = subjects[i].text.strip()
                attendance_grade = subjects[i + 1].text.strip()
                performance_grade = subjects[i + 2].text.strip()
                print(f"{subject}: Attendance Grade - {attendance_grade}, Performance Grade - {performance_grade}")
            else:
                print("Not enough elements in the subjects list.")

    else:
        print("Registration number and name not found in the HTML.")

    # Close the browser window
    driver.quit()

# Replace '21131a0527' with the actual registration number you want to search
scrape_results('21131a0527')
