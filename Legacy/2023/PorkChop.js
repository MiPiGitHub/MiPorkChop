// Replace this with your Google Form URL
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSft-dOSr_axCy-EMB6yN1gXn1ELDZqXTfrGCmcUCmksbaaAlg/viewform';
// Need to replace these with actual image file paths
const RED_IMAGE_PATH = 'red.png';
const GREEN_IMAGE_PATH = 'green.png';

function updateStatusIndicator() {
    // Fetch the Google Form responses
    fetch(FORM_URL)
        .then((response) => response.text())
        .then((data) => {
            // Parse the HTML content of the Google Form
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');

            // Find the question's response in the HTML (replace 'question-id' with the actual question's ID ****Where at?****  But ID is entry.1565515877)
            const questionResponse = doc.querySelector('.freebirdFormviewerViewItemsRadioChoice[aria-checked="true"]');

            // Find the indicator image element
            const indicatorImg = document.getElementById('indicator-img');

            if (questionResponse) {
                // Set the image based on the response
                if (questionResponse.innerText === 'Closed') {
                    indicatorImg.src = RED_IMAGE_PATH;
                } else if (questionResponse.innerText === 'Open') {
                    indicatorImg.src = GREEN_IMAGE_PATH;
                }
            }
        })
        .catch((error) => {
            console.error('Failed to fetch form responses:', error);
        });
}

// Call the updateStatusIndicator function to update the indicator on page load
updateStatusIndicator();
// Poll for updates every 10 seconds (adjust as needed)
setInterval(updateStatusIndicator, 10000);
