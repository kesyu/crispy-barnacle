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
        
        // Display status with badge
        const statusElement = document.getElementById('user-status')!;
        const statusBadge = getStatusBadge(user.status);
        statusElement.innerHTML = statusBadge;

        // Show verification image if available
        const imageContainer = document.getElementById('verification-image-container')!;
        if (user.verificationImagePath) {
            // Add cache-busting parameter to force browser to reload image
            const timestamp = new Date().getTime();
            const imageUrl = `${API_BASE_URL}/files?path=${encodeURIComponent(user.verificationImagePath)}&t=${timestamp}`;
            imageContainer.innerHTML = `
                <p><strong>Verification Image:</strong></p>
                <img src="${imageUrl}" alt="Verification Image" class="verification-image" />
            `;
        }

        reviewSection!.style.display = 'block';

        // Set up button states based on URL action and current user status
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        const requestPictureBtn = document.getElementById('request-picture-btn') as HTMLButtonElement;
        const currentStatus = user.status?.toUpperCase();
        
        // Reset all buttons to enabled state first
        [approveBtn, rejectBtn, requestPictureBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
        
        // If user is already approved, keep reject button active (can change to reject)
        // If user is already rejected, keep approve button active (can change to approve)
        if (currentStatus === 'APPROVED') {
            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
                approveBtn.style.cursor = 'not-allowed';
            }
            // Reject and request picture buttons stay active
        } else if (currentStatus === 'REJECTED') {
            if (rejectBtn) {
                rejectBtn.disabled = true;
                rejectBtn.style.opacity = '0.5';
                rejectBtn.style.cursor = 'not-allowed';
            }
            // Approve and request picture buttons stay active
        } else if (currentStatus === 'PICTURE_REQUESTED') {
            // User has been requested to upload a new picture - all action buttons stay active
            // Admin can still approve, reject, or request another picture
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
        document.getElementById('user-status')!.innerHTML = getStatusBadge('APPROVED');
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
        document.getElementById('user-status')!.innerHTML = getStatusBadge('REJECTED');
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

// Request new picture
async function requestPicture() {
    if (!userId) return;

    const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
    const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
    const requestPictureBtn = document.getElementById('request-picture-btn') as HTMLButtonElement;
    
    // Disable all buttons during request
    [approveBtn, rejectBtn, requestPictureBtn].forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });

    try {
        const response = await axios.post(
            `${API_BASE_URL}/admin/users/${userId}/request-picture`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('Picture request sent to user successfully!', 'success');
        document.getElementById('user-status')!.innerHTML = getStatusBadge('PICTURE_REQUESTED');
        
        // Re-enable all buttons after successful request
        [approveBtn, rejectBtn, requestPictureBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    } catch (error: any) {
        console.error('Request picture error:', error);
        console.error('Error response:', error.response);
        const errorMsg = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Unknown error';
        showMessage('Failed to request new picture: ' + errorMsg, 'error');
        // Re-enable buttons on failure
        [approveBtn, rejectBtn, requestPictureBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }
}

// Attach button handlers
document.getElementById('approve-btn')?.addEventListener('click', approveUser);
document.getElementById('reject-btn')?.addEventListener('click', rejectUser);
document.getElementById('request-picture-btn')?.addEventListener('click', requestPicture);

function getStatusBadge(status: string): string {
    const upperStatus = status?.toUpperCase() || '';
    switch (upperStatus) {
        case 'APPROVED':
            return '<span style="background: #4caf50; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">✓ APPROVED</span>';
        case 'PICTURE_REQUESTED':
            return '<span style="background: #2196f3; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">📷 PICTURE REQUESTED</span>';
        case 'REJECTED':
        case 'DECLINED': // Handle "declined" as "rejected" for backward compatibility
            return '<span style="background: #f44336; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">✗ REJECTED</span>';
        case 'IN_REVIEW':
            return '<span style="background: #ff9800; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">⏳ IN REVIEW</span>';
        default:
            return `<span style="background: #9e9e9e; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">${status}</span>`;
    }
}

function showMessage(message: string, type: 'success' | 'error') {
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
    }
}

