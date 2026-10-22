# MDI: Version 0.2

import RPi.GPIO as GPIO
import requests
import time

# Set the GPIO pin for the door status input
GPIO_PIN = 17  # Replace with your actual GPIO pin number

# Google Form URL
FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSft-dOSr_axCy-EMB6yN1gXn1ELDZqXTfrGCmcUCmksbaaAlg/viewform"  # Replace with your Google Form URL

def update_door_status(status):
    data = {"entry.1565515877": status}  # Replace INSERT_QUESTION_ID_HERE with the actual question ID
    response = requests.post(FORM_URL, data=data)
    if response.status_code == 200:
        print("Form updated successfully")
    else:
        print("Failed to update form")
	print("Response Status Code:", response.status_code)
	print("Post data: ", data)
	print("Response Content:", response.text)

try:
    # Set up GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(GPIO_PIN, GPIO.IN)

    while True:
        if GPIO.input(GPIO_PIN) == GPIO.LOW:
            # GPIO contact is closed, update the form with "DoorClosed"
            update_door_status("DoorClosed")
        else:
            # GPIO contact is open, update the form with "DoorOpen"
            update_door_status("DoorOpen")

        time.sleep(60)  # Update status every minute (adjust as needed)
except KeyboardInterrupt:
    GPIO.cleanup()
