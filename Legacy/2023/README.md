# MiPi-PorkChop
GarageMahal Tracker
# The intent of this project is to track when friends are invited to a local Garage Mahal.
# The Garage Mahal is a garage where friends will gather to play video games, watch TV, throw darts, etc - when the owner has declared "Games are open now"
# Traditionally this has been done by a group text or a series of manual text messages.  The aim is to automate this with a "single pole single throw switch - tied to a Raspiberi Pi 4b 2GB.
# The initial PoC is to have an input of a Raspberi Pi 4b (GPIO 17?) that will indicate an "open" or "closed" circuit that coresponds to the Garage Mahal being "opened" or "Closed".  This should enable friends and family to check the status of a google form (At some point maybe a simple green or red icon on a web page) to know - "come on over, Garage Mahal is open"
#
#
# CURRENT STATUS
#
#  1: Google Form created: https://docs.google.com/forms/d/e/1FAIpQLSft-dOSr_axCy-EMB6yN1gXn1ELDZqXTfrGCmcUCmksbaaAlg/viewform
#  2: Initial draft of PorkChop.PY
#      A) Load GPIO modules
#      B) Read GPIO input (Circuit OPEN or CLOSED)
#      C) Post to form the status of Garage Mahal
#
#  CHALLENGES
#  2.C:  Getting error when posting
# python ./BoyzBuzzn.py 
#  Failed to update form
#  ('Response Status Code:', 405)
#  ('Post data: ', {'entry.1565515877': 'DoorOpen'})
# *** OR ***
# python3 ./BoyzBuzzn.py 
#  File "./BoyzBuzzn.py", line 18
#    print("Response Status Code:", response.status_code)
#                                                       ^
#  TabError: inconsistent use of tabs and spaces in indentation
#
#
#
# *** next Steps ***
#  1: Tune sample HTML and JS to allow users to "see" status of Garage Mahal. (PorkChop.html and PorkChop.JS)
#  2: Add a "yellow" or "closing soon" feature with either a second GPIO input or a timed states of; Open, Closing soon(for 30 min after switch/circuit closed), and closed"
#
#
#
#
#  *** FILES ***
# PorkChop.py:  Raspberry Pi script to detect status of GPIO and relay status to Google Form
# PorkChop.html: Display a red or green (future Amber) image on a webpage based on the status from the Google Form
# PorkChop.js: JavaScript to fetch the form responses and dynamically update the image
