import requests
from bs4 import BeautifulSoup

def scrape_results(registration_number):
    url = "http://gvpce.ac.in:10000/GVP%20Results/RegularResults.jsp?semname=B.%20Tech.%20IV%20Semester%20(R-2020)%20(For%202021%20Admitted%20Batches)%20Regular%20Examination%20Results,%20June-2023&regulation=R-2020&semester=4&lastdaterev=27-09-2023"  # Replace with the actual URL
    data = {"input1": registration_number}
    
    # Send a POST request to the college results page
    response = requests.post(url, data=data)

    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        # Parse the HTML content with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')

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
                subject = subjects[i].text.strip()
                attendance_grade = subjects[i + 1].text.strip()
                performance_grade = subjects[i + 2].text.strip()
                print(f"{subject}: Attendance Grade - {attendance_grade}, Performance Grade - {performance_grade}")

        else:
            print("Registration number and name not found in the HTML.")

    else:
        print(f"Failed to fetch data. Status code: {response.status_code}")

# Replace '21131a0527' with the actual registration number you want to search
scrape_results("21131a0527")
