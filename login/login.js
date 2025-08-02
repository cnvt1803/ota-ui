import { loginToServer, getInfo } from '../callAPI.js';

// Function to reset login button state
function resetLoginButton() {
  const btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.innerHTML = 'Sign In';
}

// Function to clear form fields
function clearForm() {
  emailField.value = '';
  passwordField.value = '';
  hideMessage();
}

// Function to handle login success
function handleLoginSuccess(userRole) {
  showMessage('Login successful! Redirecting...', 'success');
  
  // Clear sensitive data from memory
  clearForm();
  
  setTimeout(() => {
    if (userRole === 'admin') {
      window.location.href = '../technician/technician.html';
    } else {
      window.location.href = '../customer/customer.html';
    }
  }, 1500);
}

// DOM Elements
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const messageDiv = document.getElementById('message');

// Show message
function showMessage(text, type = 'error') {
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  messageDiv.style.display = 'block';
}

// Hide message
function hideMessage() {
  messageDiv.style.display = 'none';
}

// Login function
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = emailField.value.trim();
  const password = passwordField.value.trim();
  
  // Clear previous messages
  hideMessage();

  // Basic validation
  if (!email) {
    showMessage('Please enter your email address', 'error');
    emailField.focus();
    return;
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('Please enter a valid email address', 'error');
    emailField.focus();
    return;
  }
  
  if (!password) {
    showMessage('Please enter your password', 'error');
    passwordField.focus();
    return;
  }

  if (password.length < 6) {
    showMessage('Password must be at least 6 characters long', 'error');
    passwordField.focus();
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>Signing In...';

  const userData = {
    email: email,
    password: password
  }

  try {
    console.log('Attempting to login with:', { email, password: '***' });
    
    const response = await loginToServer(userData);
    console.log('Login response:', response);
    
    if (response && response.access_token) {
      sessionStorage.setItem('userToken', JSON.stringify(response.access_token));
      
      const userInfo = await getInfo();
      console.log('User info:', userInfo);
      
      if (userInfo && userInfo.user && userInfo.user.role) {
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        const userRole = userInfo.user.role;
        
        handleLoginSuccess(userRole);
      } else {
        showMessage('Failed to get user information. Please try again.', 'error');
        resetLoginButton();
      }
    } else {
      showMessage('Login failed. Please check your credentials.', 'error');
      resetLoginButton();
    }
  } catch (error) {
    showMessage('Login failed. Please check your connection and try again.', 'error');
    resetLoginButton();
  }
});

// Create account button
document.getElementById('signupBtn').addEventListener('click', () => {
  window.location.href = './register.html';
});

// Enter key handling
emailField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') passwordField.focus();
});

passwordField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// Auto-focus email field on page load
window.addEventListener('load', () => {
  emailField.focus();
});

// Add keyboard shortcut for quick login (Ctrl+Enter)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('loginBtn').click();
  }
});
