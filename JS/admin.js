const options = { year: 'numeric', month: 'long', day: 'numeric' };
const currentDate = new Date().toLocaleDateString('en-US', options);

const welcomeElement = document.getElementById('welcome-msg');
welcomeElement.innerHTML = `Welcome Admin. <span style="font-size: 0.6em; font-weight: normal; display: block; opacity: 0.8;"> Today's date is ${currentDate}</span>`;

document.getElementById('loginForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const userInput = document.getElementById('username').value;
  const passInput = document.getElementById('password').value;

  const validUsername = 'admin';
  const validPassword = 'testpass123';

  const errorMsg = document.getElementById('error-msg');

  if (userInput === validUsername && passInput === validPassword) {
    
    alert('Login successful! Welcome Admin.');
    // window.location.href = 'dashboard.html'; // for Applications view
  } else {
    alert('Invalid username or password. Please try again.');
    userInput.value = "";
    passInput.value = "";
  }
});