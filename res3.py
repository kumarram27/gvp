from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

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

    # Wait for the page to load
    wait = WebDriverWait(driver, 10)  # Adjust the timeout as needed
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'td[align="center"]')))

    # Get the HTML content after form submission
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    # Find the element containing registration number and name
    reg_no_name_element = soup.find('td', {'colspan': '3'})

    # Check if the element exists
    if reg_no_name_element:
        # Extract relevant information
        reg_no = reg_no_name_element.text.strip()
        name_element = reg_no_name_element.find_next('td', {'colspan': '3'})
        name = name_element.text.strip() if name_element else "Name not found"

        # Display the extracted information
        print(f"Regd.No: {reg_no}")
        print(f"Name: {name}")

        # Extract and display subject details
        subject_rows = soup.select('table[bordercolor="lightblue"] tr:has(td)')
        for row in subject_rows:
            columns = row.find_all('td')
            if len(columns) == 4:
                subject = columns[0].text.strip()
                attendance_grade = columns[1].text.strip()
                performance_grade = columns[2].text.strip()
                credits = columns[3].text.strip()
                print(f"{subject}: Attendance Grade - {attendance_grade}, Performance Grade - {performance_grade}, Credits - {credits}\n")

        # Extract and display SGPA (modify this based on actual HTML structure)
        sgpa_element = soup.find('th', text='SGPA')
        if sgpa_element:
            sgpa = sgpa_element.find_next('td').text.strip()
            print(f"SGPA: {sgpa}")

    else:
        print("Registration number and name not found in the HTML.")

    # Close the browser window
    driver.quit()

# Replace '21131a0527' with the actual registration number you want to search
scrape_results('21131a05f8')
