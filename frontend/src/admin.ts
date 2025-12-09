import { authApi } from './api';
import axios from 'axios';

const API_BASE_URL = '/api';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
const action = urlParams.get('action'); // 'approve' or 'reject'

const messageDiv = document.getElementById('message');
const loginSection = document.getElementById('login-section');
const reviewSection = document.getElementById('review-section');
const loginForm = document.getElementById('admin-login-form') as HTMLFormElement;

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    // User is logged in, show review section
    loadUserDetails();
} else {
    // Show login form
    loginSection!.style.display = 'block';
}

// Handle login
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('admin-email') as HTMLInputElement).value;
    const password = (document.getElementById('admin-password') as HTMLInputElement).value;

    try {
        const response = await authApi.login({ email, password });
        localStorage.setItem('token', response.token);
        localStorage.setItem('userEmail', response.email);
        
        // Hide login, show review
        loginSection!.style.display = 'none';
        showMessage('Login successful! Loading user details...', 'success');
        await loadUserDetails();
    } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Invalid credentials';
        showMessage('Login failed: ' + errorMsg, 'error');
        console.error('Login error:', error);
    }
});

// Load user details for review
async function loadUserDetails() {
    if (!userId) {
        showMessage('No user ID provided', 'error');
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const user = response.data;
        document.getElementById('user-name')!.textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('user-email')!.textContent = user.email;
        document.getElementById('user-date')!.textContent = new Date(user.createdAt).toLocaleString();
        document.getElementById('user-status')!.textContent = user.status;

        // Show verification image if available
        const imageContainer = document.getElementById('verification-image-container')!;
        if (user.verificationImagePath) {
            const imageUrl = `${API_BASE_URL}/files?path=${encodeURIComponent(user.verificationImagePath)}`;
            imageContainer.innerHTML = `
                <p><strong>Verification Image:</strong></p>
                <img src="${imageUrl}" alt="Verification Image" class="verification-image" />
            `;
        }

        reviewSection!.style.display = 'block';

        // Set up button states based on URL action and current user status
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        const currentStatus = user.status?.toUpperCase();
        
        // If user is already approved, keep reject button active (can change to reject)
        // If user is already rejected, keep approve button active (can change to approve)
        if (currentStatus === 'APPROVED') {
            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
                approveBtn.style.cursor = 'not-allowed';
            }
            // Reject button stays active
        } else if (currentStatus === 'REJECTED') {
            if (rejectBtn) {
                rejectBtn.disabled = true;
                rejectBtn.style.opacity = '0.5';
                rejectBtn.style.cursor = 'not-allowed';
            }
            // Approve button stays active
        } else {
            // User is IN_REVIEW - handle based on URL action parameter
            if (action === 'approve') {
                // Came through approve link - grey out approve button, keep reject active
                if (approveBtn) {
                    approveBtn.disabled = true;
                    approveBtn.style.opacity = '0.5';
                    approveBtn.style.cursor = 'not-allowed';
                }
                // Auto-execute approve after a short delay
                setTimeout(() => {
                    approveUser();
                }, 1000);
            } else if (action === 'reject') {
                // Came through reject link - grey out reject button, keep approve active
                if (rejectBtn) {
                    rejectBtn.disabled = true;
                    rejectBtn.style.opacity = '0.5';
                    rejectBtn.style.cursor = 'not-allowed';
                }
                // Auto-execute reject after a short delay
                setTimeout(() => {
                    rejectUser();
                }, 1000);
            }
        }
    } catch (error: any) {
        if (error.response?.status === 401) {
            // Not authenticated, show login
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            loginSection!.style.display = 'block';
            reviewSection!.style.display = 'none';
            showMessage('Please log in to review this user', 'error');
        } else {
            showMessage('Failed to load user details: ' + (error.response?.data?.error || 'Unknown error'), 'error');
        }
    }
}

// Approve user
async function approveUser() {
    if (!userId) return;

    try {
        const response = await axios.post(
            `${API_BASE_URL}/admin/users/${userId}/approve`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('User approved successfully!', 'success');
        document.getElementById('user-status')!.textContent = 'APPROVED';
        // After approval, disable approve button but keep reject active so admin can change mind
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        if (approveBtn) {
            approveBtn.disabled = true;
            approveBtn.style.opacity = '0.5';
            approveBtn.style.cursor = 'not-allowed';
        }
        // Reject button stays active and enabled
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.style.opacity = '1';
            rejectBtn.style.cursor = 'pointer';
        }
    } catch (error: any) {
        showMessage('Failed to approve user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
}

// Reject user
async function rejectUser() {
    if (!userId) return;

    try {
        const response = await axios.post(
            `${API_BASE_URL}/admin/users/${userId}/reject`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('User rejected successfully!', 'success');
        document.getElementById('user-status')!.textContent = 'REJECTED';
        // After rejection, disable reject button but keep approve active so admin can change mind
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        if (rejectBtn) {
            rejectBtn.disabled = true;
            rejectBtn.style.opacity = '0.5';
            rejectBtn.style.cursor = 'not-allowed';
        }
        // Approve button stays active and enabled
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.style.opacity = '1';
            approveBtn.style.cursor = 'pointer';
        }
    } catch (error: any) {
        showMessage('Failed to reject user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
}

// Attach button handlers
document.getElementById('approve-btn')?.addEventListener('click', approveUser);
document.getElementById('reject-btn')?.addEventListener('click', rejectUser);

function showMessage(message: string, type: 'success' | 'error') {
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
    }
}

