document.addEventListener('DOMContentLoaded', function() {
    const popup = document.getElementById('popupForm');
    const closeButton = document.querySelector('.close-button');
    const form = document.getElementById('userInfo');

    // Show the popup
    popup.style.display = 'block';

    // Close the popup when the close button is clicked
    closeButton.onclick = function() {
        popup.style.display = 'none';
    };

    // Handle form submission
    form.onsubmit = function(event) {
        event.preventDefault(); // Prevent form from submitting normally
        alert('Thank you for submitting your information!');
        popup.style.display = 'none'; // Hide the popup
    };
});
