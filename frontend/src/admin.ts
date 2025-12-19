import { authApi, spaceTemplateApi, SpaceTemplateDTO, isTokenExpired, eventApi, adminApi, UserDetailsDTO } from './api';
import axios from 'axios';

const API_BASE_URL = '/api';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
const action = urlParams.get('action'); // 'approve' or 'reject'

const messageDiv = document.getElementById('message');
const loginSection = document.getElementById('login-section');
const reviewModal = document.getElementById('review-modal');
const usersListSection = document.getElementById('users-list-section');
const eventsSection = document.getElementById('events-section');
const adminMenubar = document.getElementById('admin-menubar');
const loginForm = document.getElementById('admin-login-form') as HTMLFormElement;
let currentReviewUserId: string | null = null;
let originalUserValues: {
    age: string | null;
    location: string | null;
    height: string | null;
    size: string | null;
    adminComments: string | null;
} | null = null;

// Check if user is already logged in and token is valid
const token = localStorage.getItem('token');
if (token && !isTokenExpired(token)) {
    // User is logged in with valid token, show menubar and appropriate section
    adminMenubar!.style.display = 'flex';
    document.getElementById('admin-dashboard-header')!.style.display = 'block';
    
    if (userId) {
        // If userId in URL, open review modal
        openReviewModal(userId);
    } else {
        // Otherwise show users list
        showUsersListPage();
        loadAllUsers();
    }
} else {
    // Token is missing or expired, clear it and show login form
    if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
    }
    loginSection!.style.display = 'block';
    if (messageDiv) {
        messageDiv.textContent = 'Your session has expired. Please log in again.';
        messageDiv.className = 'error';
        messageDiv.style.display = 'block';
    }
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
        
        // Hide login, show appropriate section
        loginSection!.style.display = 'none';
        document.getElementById('admin-dashboard-header')!.style.display = 'block';
        adminMenubar!.style.display = 'flex';
        
        if (userId) {
            showMessage('Login successful! Loading user details...', 'success');
            showReviewPage();
            await loadUserDetails();
        } else {
            showMessage('Login successful!', 'success');
            showUsersListPage();
            await loadAllUsers();
        }
    } catch (error: any) {
        let errorMsg: string;
        
        // Check if it's a network error (backend not running)
        if (!error.response) {
            // No response means server is unreachable
            errorMsg = 'Cannot connect to server. Please check if the backend is running.';
        } else if (error.response?.status >= 500) {
            // Server error
            errorMsg = 'Server error. Please try again later.';
        } else {
            // Client error (401, 400, etc.) - likely invalid credentials
            errorMsg = error.response?.data?.error || error.response?.data?.message || 'Invalid credentials';
        }
        
        showMessage('Login failed: ' + errorMsg, 'error');
        console.error('Login error:', error);
    }
});

// Open review modal
async function openReviewModal(userId: string) {
    currentReviewUserId = userId;
    if (reviewModal) {
        // Disable save button initially
        const saveBtn = document.getElementById('save-user-details-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
        reviewModal.classList.add('active');
        await loadUserDetails(userId);
    }
}

// Close review modal
function closeReviewModal() {
    if (reviewModal) {
        reviewModal.classList.remove('active');
        currentReviewUserId = null;
    }
}

// Load user details for review
async function loadUserDetails(userIdParam?: string) {
    const userIdToUse = userIdParam || userId || currentReviewUserId;
    if (!userIdToUse) {
        showMessage('No user ID provided', 'error');
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/users/${userIdToUse}`, {
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
        
        // Populate editable fields
        const ageInput = document.getElementById('user-age') as HTMLInputElement;
        const locationInput = document.getElementById('user-location') as HTMLInputElement;
        const heightInput = document.getElementById('user-height') as HTMLInputElement;
        const sizeInput = document.getElementById('user-size') as HTMLInputElement;
        const adminCommentsInput = document.getElementById('user-admin-comments') as HTMLTextAreaElement;
        
        ageInput.value = user.age || '';
        locationInput.value = user.location || '';
        heightInput.value = user.height || '';
        sizeInput.value = user.size || '';
        adminCommentsInput.value = user.adminComments || '';
        
        // Store original values for change detection
        originalUserValues = {
            age: user.age ? String(user.age) : null,
            location: user.location || null,
            height: user.height || null,
            size: user.size || null,
            adminComments: user.adminComments || null
        };
        
        // Disable save button initially
        const saveBtn = document.getElementById('save-user-details-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
        
        // Attach change listeners to enable/disable save button
        attachUserDetailsChangeListeners();

        // Show verification image if available
        const imageContainer = document.getElementById('verification-image-container')!;
        if (user.verificationImagePath) {
            // Add cache-busting parameter to force browser to reload image
            const timestamp = new Date().getTime();
            const imageUrl = `${API_BASE_URL}/files?path=${encodeURIComponent(user.verificationImagePath)}&t=${timestamp}`;
            imageContainer.innerHTML = `
                <p><strong>Verification Image:</strong></p>
                <div style="display: flex; justify-content: center; align-items: center; margin-top: 10px;">
                    <img src="${imageUrl}" 
                         alt="Verification Image" 
                         class="verification-thumbnail"
                         data-full-image="${imageUrl}"
                         style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" />
                </div>
                <p style="text-align: center; margin-top: 0.5rem; color: #666; font-size: 0.85rem;">Click to view full size</p>
            `;
            
            // Attach click handler for thumbnail
            const thumbnail = imageContainer.querySelector('.verification-thumbnail');
            if (thumbnail) {
                thumbnail.addEventListener('click', () => {
                    openImageViewer(imageUrl);
                });
            }
        }

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
            // User has been requested to upload a new picture
            // Disable request picture button since user already has this status
            if (requestPictureBtn) {
                requestPictureBtn.disabled = true;
                requestPictureBtn.style.opacity = '0.5';
                requestPictureBtn.style.cursor = 'not-allowed';
            }
            // Approve and reject buttons stay active - admin can still approve or reject
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
            closeReviewModal();
            showMessage('Please log in to review this user', 'error');
        } else {
            showMessage('Failed to load user details: ' + (error.response?.data?.error || 'Unknown error'), 'error');
        }
    }
}

// Approve user
async function approveUser() {
    const userIdToUse = currentReviewUserId || userId;
    if (!userIdToUse) return;

    try {
        const response = await axios.post(
            `${API_BASE_URL}/admin/users/${userIdToUse}/approve`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('User approved successfully!', 'success');
        document.getElementById('user-status')!.innerHTML = getStatusBadge('APPROVED');
        // After approval, disable approve button but keep reject and request picture active
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        const requestPictureBtn = document.getElementById('request-picture-btn') as HTMLButtonElement;
        if (approveBtn) {
            approveBtn.disabled = true;
            approveBtn.style.opacity = '0.5';
            approveBtn.style.cursor = 'not-allowed';
        }
        // Reject and request picture buttons stay active and enabled
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.style.opacity = '1';
            rejectBtn.style.cursor = 'pointer';
        }
        if (requestPictureBtn) {
            requestPictureBtn.disabled = false;
            requestPictureBtn.style.opacity = '1';
            requestPictureBtn.style.cursor = 'pointer';
        }
        // Reload users list to reflect the change
        loadAllUsers();
    } catch (error: any) {
        showMessage('Failed to approve user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
}

// Reject user
async function rejectUser() {
    const userIdToUse = currentReviewUserId || userId;
    if (!userIdToUse) return;

    try {
        const response = await axios.post(
            `${API_BASE_URL}/admin/users/${userIdToUse}/reject`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('User rejected successfully!', 'success');
        document.getElementById('user-status')!.innerHTML = getStatusBadge('REJECTED');
        // After rejection, disable reject button but keep approve and request picture active
        const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
        const rejectBtn = document.getElementById('reject-btn') as HTMLButtonElement;
        const requestPictureBtn = document.getElementById('request-picture-btn') as HTMLButtonElement;
        if (rejectBtn) {
            rejectBtn.disabled = true;
            rejectBtn.style.opacity = '0.5';
            rejectBtn.style.cursor = 'not-allowed';
        }
        // Approve and request picture buttons stay active and enabled
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.style.opacity = '1';
            approveBtn.style.cursor = 'pointer';
        }
        if (requestPictureBtn) {
            requestPictureBtn.disabled = false;
            requestPictureBtn.style.opacity = '1';
            requestPictureBtn.style.cursor = 'pointer';
        }
        // Reload users list to reflect the change
        loadAllUsers();
    } catch (error: any) {
        showMessage('Failed to reject user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
}

// Request new picture
async function requestPicture() {
    const userIdToUse = currentReviewUserId || userId;
    if (!userIdToUse) return;

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
            `${API_BASE_URL}/admin/users/${userIdToUse}/request-picture`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        showMessage('Picture request sent to user successfully!', 'success');
        document.getElementById('user-status')!.innerHTML = getStatusBadge('PICTURE_REQUESTED');
        
        // Re-enable approve and reject buttons, but disable request picture button
        // since user now has PICTURE_REQUESTED status
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.style.opacity = '1';
            approveBtn.style.cursor = 'pointer';
        }
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.style.opacity = '1';
            rejectBtn.style.cursor = 'pointer';
        }
        if (requestPictureBtn) {
            requestPictureBtn.disabled = true;
            requestPictureBtn.style.opacity = '0.5';
            requestPictureBtn.style.cursor = 'not-allowed';
        }
        // Reload users list to reflect the change
        loadAllUsers();
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

// Page navigation functions
function showUsersListPage() {
    eventsSection!.style.display = 'none';
    usersListSection!.style.display = 'block';
    document.getElementById('menubar-users')?.classList.add('active');
    document.getElementById('menubar-events')?.classList.remove('active');
    document.getElementById('menubar-review')?.classList.remove('active');
    document.getElementById('admin-dashboard-header')!.style.display = 'block';
}

function showEventsPage() {
    usersListSection!.style.display = 'none';
    eventsSection!.style.display = 'block';
    document.getElementById('menubar-events')?.classList.add('active');
    document.getElementById('menubar-users')?.classList.remove('active');
    document.getElementById('menubar-review')?.classList.remove('active');
    document.getElementById('admin-dashboard-header')!.style.display = 'block';
    loadAllEvents();
}

function showReviewPage() {
    // This function is kept for backward compatibility with URL-based navigation
    // But now we use the modal instead
    if (userId) {
        openReviewModal(userId);
    }
}

// Menubar navigation
document.getElementById('menubar-users')?.addEventListener('click', () => {
    // Clear userId from URL if present
    if (window.location.search.includes('userId')) {
        window.history.pushState({}, '', window.location.pathname);
    }
    showUsersListPage();
    loadAllUsers();
});

document.getElementById('menubar-events')?.addEventListener('click', () => {
    // Clear userId from URL if present
    if (window.location.search.includes('userId')) {
        window.history.pushState({}, '', window.location.pathname);
    }
    showEventsPage();
});

document.getElementById('menubar-review')?.addEventListener('click', () => {
    // If no userId in URL, show message
    if (!userId) {
        showMessage('Please select a user from the users list to review', 'error');
        return;
    }
    openReviewModal(userId);
});

// Close review modal handlers
document.getElementById('close-review-modal')?.addEventListener('click', closeReviewModal);

// Close modal when clicking outside
document.getElementById('review-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('review-modal')) {
        closeReviewModal();
    }
});

// Load all users
async function loadAllUsers(statusFilter?: string) {
    const container = document.getElementById('users-list-container');
    if (!container) return;
    
    container.innerHTML = '<p>Loading users...</p>';
    
    try {
        const url = statusFilter 
            ? `${API_BASE_URL}/admin/users?status=${statusFilter}`
            : `${API_BASE_URL}/admin/users`;
        
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.get(url, { headers });
        
        const users = response.data;
        
        if (users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Name & Email</th>
                        <th>Status</th>
                        <th>Personal Info</th>
                        <th>Registered</th>
                        <th>Booked</th>
                        <th>Image</th>
                    </tr>
                </thead>
                <tbody class="users-list">
                </tbody>
            </table>
        `;
        const usersList = container.querySelector('.users-list')!;
        
        users.forEach((user: any) => {
            const timestamp = new Date().getTime();
            const imageUrl = user.verificationImagePath 
                ? `${API_BASE_URL}/files?path=${encodeURIComponent(user.verificationImagePath)}&t=${timestamp}`
                : null;
            
            const adminComments = user.adminComments || '';
            const hasAdminComments = adminComments.trim().length > 0;
            
            // Build name and email as a table structure with thought bubble if comments exist
            const thoughtBubble = hasAdminComments 
                ? '<span class="thought-bubble" data-comments="' + adminComments.replace(/"/g, '&quot;') + '">💭</span>'
                : '';
            
            const nameEmail = `
                <table class="name-email-table">
                    <tr>
                        <td class="name-value">
                            ${user.firstName} ${user.lastName}
                            ${thoughtBubble}
                        </td>
                    </tr>
                    <tr>
                        <td class="email-value">${user.email}</td>
                    </tr>
                </table>
            `;
            
            // Build personal info as a table structure
            const personalInfo = `
                <table class="personal-info-table">
                    <tr>
                        <td class="info-label">Age:</td>
                        <td class="info-value">${user.age || '-'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Location:</td>
                        <td class="info-value">${user.location || '-'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Height:</td>
                        <td class="info-value">${user.height || '-'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Size:</td>
                        <td class="info-value">${user.size || '-'}</td>
                    </tr>
                </table>
            `;
            
            const userRow = document.createElement('tr');
            userRow.className = 'user-row';
            userRow.innerHTML = `
                <td class="user-name-email">${nameEmail}</td>
                <td class="user-status-cell">${getStatusBadge(user.status)}</td>
                <td class="user-personal-info">${personalInfo}</td>
                <td class="user-date">${new Date(user.createdAt).toLocaleDateString()}</td>
                <td class="user-spaces">${user.bookedSpacesCount}</td>
                <td class="user-image-cell">
                    ${imageUrl ? `
                        <img src="${imageUrl}" 
                             alt="Verification Image" 
                             class="verification-thumbnail"
                             data-full-image="${imageUrl}"
                             style="max-width: 60px; max-height: 60px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" />
                    ` : '<span style="color: #999; font-size: 0.85rem;">No image</span>'}
                </td>
            `;
            
            // Attach hover handlers for thought bubble if it exists
            if (hasAdminComments) {
                const thoughtBubbleElement = userRow.querySelector('.thought-bubble');
                if (thoughtBubbleElement) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'admin-comments-tooltip';
                    // Convert URLs to clickable links
                    tooltip.innerHTML = convertUrlsToLinks(adminComments);
                    tooltip.style.display = 'none';
                    document.body.appendChild(tooltip);
                    
                    let tooltipTimeout: number | null = null;
                    
                    const showTooltip = (e: MouseEvent) => {
                        const bubble = e.target as HTMLElement;
                        const rect = bubble.getBoundingClientRect();
                        
                        // Clear any pending hide timeout
                        if (tooltipTimeout !== null) {
                            clearTimeout(tooltipTimeout);
                            tooltipTimeout = null;
                        }
                        
                        // Position tooltip to the right of the bubble initially
                        tooltip.style.left = (rect.right + 10) + 'px';
                        tooltip.style.top = rect.top + 'px';
                        tooltip.style.display = 'block';
                        
                        // After displaying, check if we need to adjust position
                        setTimeout(() => {
                            const tooltipRect = tooltip.getBoundingClientRect();
                            let left = rect.right + 10;
                            let top = rect.top;
                            
                            // Adjust if tooltip would go off screen to the right
                            if (left + tooltipRect.width > window.innerWidth) {
                                // Position to the left instead
                                left = rect.left - tooltipRect.width - 10;
                                tooltip.classList.add('tooltip-left');
                            } else {
                                tooltip.classList.remove('tooltip-left');
                            }
                            
                            // Adjust vertical position if needed
                            if (top + tooltipRect.height > window.innerHeight) {
                                top = window.innerHeight - tooltipRect.height - 10;
                            }
                            
                            tooltip.style.left = left + 'px';
                            tooltip.style.top = top + 'px';
                        }, 0);
                    };
                    
                    const hideTooltip = () => {
                        // Delay hiding to allow mouse to move to tooltip
                        tooltipTimeout = window.setTimeout(() => {
                            tooltip.style.display = 'none';
                        }, 100);
                    };
                    
                    thoughtBubbleElement.addEventListener('mouseenter', showTooltip);
                    thoughtBubbleElement.addEventListener('mouseleave', hideTooltip);
                    
                    // Keep tooltip visible when hovering over it
                    tooltip.addEventListener('mouseenter', () => {
                        if (tooltipTimeout !== null) {
                            clearTimeout(tooltipTimeout);
                            tooltipTimeout = null;
                        }
                    });
                    
                    // Hide tooltip when mouse leaves tooltip
                    tooltip.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });
                }
            }
            
            // Attach click handler to image thumbnail if it exists
            if (imageUrl) {
                const thumbnail = userRow.querySelector('.verification-thumbnail') as HTMLImageElement;
                if (thumbnail) {
                    thumbnail.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openImageViewer(imageUrl);
                    });
                }
            }
            
            // Make row clickable to open review modal
            userRow.addEventListener('click', (e) => {
                // Don't open modal if clicking on the image
                if ((e.target as HTMLElement).closest('.verification-thumbnail')) {
                    return;
                }
                openReviewModal(user.id);
            });
            
            usersList.appendChild(userRow);
        });
    } catch (error: any) {
        console.error('Error loading users:', error);
        console.error('Error response:', error.response);
        console.error('Error message:', error.message);
        
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            loginSection!.style.display = 'block';
            usersListSection!.style.display = 'none';
            adminMenubar!.style.display = 'none';
            showMessage('Please log in to view users', 'error');
        } else {
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message || 
                                error.message || 
                                'Unknown error';
            container.innerHTML = `<p style="color: #f44336;">Failed to load users: ${errorMessage}</p>`;
            showMessage(`Failed to load users: ${errorMessage}`, 'error');
        }
    }
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const status = target.getAttribute('data-status') || '';
        
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        // Load filtered users
        loadAllUsers(status || undefined);
    });
});

// Load all events
async function loadAllEvents() {
    const container = document.getElementById('events-list-container');
    if (!container) return;
    
    container.innerHTML = '<p>Loading events...</p>';
    
    try {
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.get(`${API_BASE_URL}/events/all`, { headers });
        const events = response.data;
        
        if (events.length === 0) {
            container.innerHTML = '<p>No events found.</p>';
            return;
        }
        
        container.innerHTML = '<div class="events-list"></div>';
        const eventsList = container.querySelector('.events-list')!;
        
        events.forEach((event: any) => {
            const eventDate = new Date(event.dateTime);
            const isPast = eventDate < new Date();
            const isUpcoming = !isPast;
            const formattedDate = eventDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
            
            let statusBadge = '';
            if (event.cancelled) {
                statusBadge = '<span class="event-card-badge cancelled">Cancelled</span>';
            } else if (isPast) {
                statusBadge = '<span class="event-card-badge past">Past</span>';
            } else {
                statusBadge = '<span class="event-card-badge upcoming">Upcoming</span>';
            }
            
            const cancelButton = !event.cancelled && isUpcoming 
                ? `<button class="btn cancel-event-btn" data-event-id="${event.id}" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 10px;">Cancel Event</button>`
                : '';
            
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <div class="event-card-header">
                    <div>
                        <div class="event-card-city">${event.city}</div>
                        <div class="event-card-date">${formattedDate}</div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="event-card-info">
                    <div><strong>Total Spaces:</strong> ${event.totalSpacesCount}</div>
                    <div><strong>Available Spaces:</strong> ${event.availableSpacesCount}</div>
                    <div><strong>Booked Spaces:</strong> ${event.totalSpacesCount - event.availableSpacesCount}</div>
                </div>
                ${cancelButton}
            `;
            
            eventsList.appendChild(eventCard);
            
            // Add cancel button event listener
            if (cancelButton) {
                const cancelBtn = eventCard.querySelector('.cancel-event-btn');
                cancelBtn?.addEventListener('click', () => cancelEvent(event.id));
            }
        });
    } catch (error: any) {
        console.error('Error loading events:', error);
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Unknown error';
        container.innerHTML = `<p style="color: #f44336;">Failed to load events: ${errorMessage}</p>`;
        showMessage(`Failed to load events: ${errorMessage}`, 'error');
    }
}

// Cancel event
async function cancelEvent(eventId: number) {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        return;
    }
    
    try {
        await eventApi.cancelEvent(eventId);
        showMessage('Event cancelled successfully', 'success');
        // Reload events list
        loadAllEvents();
    } catch (error: any) {
        console.error('Error cancelling event:', error);
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Unknown error';
        showMessage(`Failed to cancel event: ${errorMessage}`, 'error');
    }
}

// Add event modal handlers
async function openAddEventModal() {
    const modal = document.getElementById('add-event-modal');
    if (modal) {
        modal.classList.add('active');
        await loadSpaceTemplates();
    }
}

async function loadSpaceTemplates() {
    const container = document.getElementById('spaces-container');
    if (!container) {
        console.error('spaces-container not found');
        return;
    }
    
    container.innerHTML = '<p>Loading spaces...</p>';
    
    try {
        const templates = await spaceTemplateApi.getAllTemplates();
        
        if (!templates || templates.length === 0) {
            container.innerHTML = '<p style="color: #f44336;">No space templates found. Please add space templates to the database.</p>';
            return;
        }
        
        // Original 6 demo event spaces (names and colors from DataInitializer)
        const originalSpaceNames = ['Buddy', 'Max', 'Rocky', 'Charlie', 'Duke', 'Cooper'];
        
        // Filter to only the original 6 spaces by name
        const originalTemplates = templates.filter(template => 
            originalSpaceNames.includes(template.name)
        );
        
        if (originalTemplates.length !== 6) {
            container.innerHTML = '<p style="color: #f44336;">Not all original space templates found. Please ensure Buddy, Max, Rocky, Charlie, Duke, and Cooper exist in the database.</p>';
            return;
        }
        
        // Map of original name-color pairs from the demo event
        const nameColorMap = new Map<string, string>([
            ['Buddy', 'GREEN'],
            ['Max', 'YELLOW'],
            ['Rocky', 'ORANGE'],
            ['Charlie', 'BLUE'],
            ['Duke', 'PURPLE'],
            ['Cooper', 'WHITE']
        ]);
        
        const usedColors = new Set<string>();
        const selectedTemplates: SpaceTemplateDTO[] = [];
        
        // Select templates matching the original name-color pairs (ensures no color repeats)
        for (const template of originalTemplates) {
            const expectedColor = nameColorMap.get(template.name);
            if (expectedColor && template.color === expectedColor && !usedColors.has(template.color)) {
                selectedTemplates.push(template);
                usedColors.add(template.color);
            }
        }
        
        // If we don't have all 6, fill remaining with any template that has an unused color
        if (selectedTemplates.length < 6) {
            for (const template of originalTemplates) {
                if (selectedTemplates.length >= 6) break;
                if (!usedColors.has(template.color)) {
                    selectedTemplates.push(template);
                    usedColors.add(template.color);
                }
            }
        }
        
        // Randomly shuffle the order (but keep all 6 with unique colors)
        const shuffled = selectedTemplates.sort(() => 0.5 - Math.random());
        
        if (shuffled.length === 0) {
            container.innerHTML = '<p style="color: #f44336;">No spaces available.</p>';
            return;
        }
        
        renderSpaceTemplates(shuffled);
    } catch (error: any) {
        console.error('Error loading space templates:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
        container.innerHTML = `<p style="color: #f44336;">Failed to load space templates: ${errorMessage}</p>`;
        showMessage('Failed to load space templates', 'error');
    }
}

function renderSpaceTemplates(templates: SpaceTemplateDTO[]) {
    const container = document.getElementById('spaces-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    templates.forEach(template => {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'space-template-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `space-template-${template.id}`;
        checkbox.value = template.id.toString();
        checkbox.checked = true; // Pre-select all randomly chosen spaces
        checkbox.className = 'space-template-checkbox';
        
        const label = document.createElement('label');
        label.htmlFor = `space-template-${template.id}`;
        
        // Color badge
        const colorBadge = document.createElement('span');
        colorBadge.className = 'space-color-badge';
        colorBadge.style.backgroundColor = getColorValue(template.color);
        
        // Name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = template.name;
        nameSpan.style.cssText = 'font-weight: 500;';
        
        label.appendChild(colorBadge);
        label.appendChild(nameSpan);
        
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        
        container.appendChild(checkboxContainer);
    });
}

function getColorValue(color: string): string {
    const colorMap: { [key: string]: string } = {
        'GREEN': '#4caf50',
        'YELLOW': '#ffeb3b',
        'ORANGE': '#ff9800',
        'BLUE': '#2196f3',
        'PURPLE': '#9c27b0',
        'WHITE': '#ffffff'
    };
    return colorMap[color.toUpperCase()] || '#cccccc';
}

function closeAddEventModal() {
    const modal = document.getElementById('add-event-modal');
    if (modal) {
        modal.classList.remove('active');
        (document.getElementById('create-event-form') as HTMLFormElement)?.reset();
        // Clear spaces container
        const spacesContainer = document.getElementById('spaces-container');
        if (spacesContainer) {
            spacesContainer.innerHTML = '<p>Loading spaces...</p>';
        }
    }
}

document.getElementById('add-event-btn')?.addEventListener('click', openAddEventModal);

document.getElementById('close-add-event-modal')?.addEventListener('click', closeAddEventModal);

document.getElementById('cancel-event-btn')?.addEventListener('click', closeAddEventModal);

// Close modal when clicking outside
document.getElementById('add-event-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('add-event-modal')) {
        closeAddEventModal();
    }
});

// Add User Modal Functions
function openAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    if (modal) {
        modal.classList.add('active');
        // Reset form
        (document.getElementById('add-user-form') as HTMLFormElement).reset();
        // Set default status to APPROVED
        const statusSelect = document.getElementById('new-user-status') as HTMLSelectElement;
        if (statusSelect) {
            statusSelect.value = 'APPROVED';
        }
        // Scroll modal content to top
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
}

function closeAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

document.getElementById('add-user-btn')?.addEventListener('click', openAddUserModal);

document.getElementById('close-add-user-modal')?.addEventListener('click', closeAddUserModal);

document.getElementById('cancel-add-user-btn')?.addEventListener('click', closeAddUserModal);

// Close modal when clicking outside
document.getElementById('add-user-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('add-user-modal')) {
        closeAddUserModal();
    }
});

// Create user form handler
document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = (document.getElementById('new-user-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('new-user-password') as HTMLInputElement).value.trim();
    const firstName = (document.getElementById('new-user-firstname') as HTMLInputElement).value.trim();
    const lastName = (document.getElementById('new-user-lastname') as HTMLInputElement).value.trim();
    const status = (document.getElementById('new-user-status') as HTMLSelectElement).value;
    const verificationImage = (document.getElementById('new-user-verification-image') as HTMLInputElement).files?.[0];
    const age = (document.getElementById('new-user-age') as HTMLInputElement).value.trim();
    const location = (document.getElementById('new-user-location') as HTMLInputElement).value.trim();
    const height = (document.getElementById('new-user-height') as HTMLInputElement).value.trim();
    const size = (document.getElementById('new-user-size') as HTMLInputElement).value.trim();
    const adminComments = (document.getElementById('new-user-admin-comments') as HTMLTextAreaElement).value.trim();
    
    try {
        const formData = new FormData();
        
        // Only append non-empty values (backend will generate defaults for email/password if empty)
        if (email) {
            formData.append('email', email);
        }
        if (password) {
            formData.append('password', password);
        }
        if (firstName) {
            formData.append('firstName', firstName);
        }
        if (lastName) {
            formData.append('lastName', lastName);
        }
        
        formData.append('status', status);
        
        if (verificationImage) {
            formData.append('verificationImage', verificationImage);
        }
        
        if (age) {
            formData.append('age', age);
        }
        
        if (location) {
            formData.append('location', location);
        }
        
        if (height) {
            formData.append('height', height);
        }
        
        if (size) {
            formData.append('size', size);
        }
        
        if (adminComments) {
            formData.append('adminComments', adminComments);
        }
        
        const newUser = await adminApi.createUser(formData);
        
        const userName = (newUser.firstName && newUser.lastName) 
            ? `${newUser.firstName} ${newUser.lastName}` 
            : (newUser.firstName || newUser.lastName || 'User');
        showMessage(`User "${userName}" created successfully! Email: ${newUser.email}`, 'success');
        closeAddUserModal();
        
        // Reload users list
        const activeFilter = document.querySelector('.filter-btn.active') as HTMLButtonElement;
        const currentStatus = activeFilter?.getAttribute('data-status') || '';
        await loadAllUsers(currentStatus || undefined);
    } catch (error: any) {
        console.error('Error creating user:', error);
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Failed to create user';
        showMessage(`Failed to create user: ${errorMessage}`, 'error');
    }
});

// Remove old add-space-btn handler - no longer needed

// Create event form handler
document.getElementById('create-event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const city = (document.getElementById('event-city') as HTMLInputElement).value;
    const dateTimeStr = (document.getElementById('event-datetime') as HTMLInputElement).value;
    
    if (!city || !dateTimeStr) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Parse datetime-local input to ISO string
    const dateTime = new Date(dateTimeStr).toISOString();
    
    // Collect selected space template IDs
    const checkboxes = document.querySelectorAll('.space-template-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const spaceTemplateIds: number[] = [];
    
    checkboxes.forEach((checkbox) => {
        spaceTemplateIds.push(parseInt(checkbox.value));
    });
    
    if (spaceTemplateIds.length === 0) {
        showMessage('Please select at least one space', 'error');
        return;
    }
    
    if (spaceTemplateIds.length > 6) {
        showMessage('Maximum 6 spaces allowed per event', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        await axios.post(
            `${API_BASE_URL}/events`,
            {
                city,
                dateTime,
                spaceTemplateIds
            },
            { headers }
        );
        
        showMessage('Event created successfully!', 'success');
        closeAddEventModal();
        
        // Reload events list
        loadAllEvents();
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Unknown error';
        showMessage('Failed to create event: ' + errorMessage, 'error');
    }
});

// Save user details
function checkUserDetailsChanges() {
    if (!originalUserValues) return;
    
    const ageInput = document.getElementById('user-age') as HTMLInputElement;
    const locationInput = document.getElementById('user-location') as HTMLInputElement;
    const heightInput = document.getElementById('user-height') as HTMLInputElement;
    const sizeInput = document.getElementById('user-size') as HTMLInputElement;
    const adminCommentsInput = document.getElementById('user-admin-comments') as HTMLTextAreaElement;
    
    const currentAge = ageInput.value.trim() || null;
    const currentLocation = locationInput.value.trim() || null;
    const currentHeight = heightInput.value.trim() || null;
    const currentSize = sizeInput.value.trim() || null;
    const currentAdminComments = adminCommentsInput.value.trim() || null;
    
    // Compare current values with original values
    const hasChanges = 
        currentAge !== originalUserValues.age ||
        currentLocation !== originalUserValues.location ||
        currentHeight !== originalUserValues.height ||
        currentSize !== originalUserValues.size ||
        currentAdminComments !== originalUserValues.adminComments;
    
    const saveBtn = document.getElementById('save-user-details-btn') as HTMLButtonElement;
    if (saveBtn) {
        if (hasChanges) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        } else {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
    }
}

let changeListenersAttached = false;

function attachUserDetailsChangeListeners() {
    // Only attach listeners once
    if (changeListenersAttached) return;
    
    document.getElementById('user-age')?.addEventListener('input', checkUserDetailsChanges);
    document.getElementById('user-location')?.addEventListener('input', checkUserDetailsChanges);
    document.getElementById('user-height')?.addEventListener('input', checkUserDetailsChanges);
    document.getElementById('user-size')?.addEventListener('input', checkUserDetailsChanges);
    document.getElementById('user-admin-comments')?.addEventListener('input', checkUserDetailsChanges);
    
    changeListenersAttached = true;
}

async function saveUserDetails() {
    const userIdToUse = currentReviewUserId || userId;
    if (!userIdToUse) {
        showMessage('No user ID provided', 'error');
        return;
    }
    
    const ageInput = document.getElementById('user-age') as HTMLInputElement;
    const locationInput = document.getElementById('user-location') as HTMLInputElement;
    const heightInput = document.getElementById('user-height') as HTMLInputElement;
    const sizeInput = document.getElementById('user-size') as HTMLInputElement;
    const adminCommentsInput = document.getElementById('user-admin-comments') as HTMLTextAreaElement;
    
    const updates: any = {};
    
    if (ageInput.value) {
        const age = parseInt(ageInput.value);
        if (!isNaN(age)) {
            updates.age = age;
        }
    } else {
        updates.age = null;
    }
    
    updates.location = locationInput.value || null;
    updates.height = heightInput.value || null;
    updates.size = sizeInput.value || null;
    updates.adminComments = adminCommentsInput.value || null;
    
    try {
        await adminApi.updateUser(parseInt(userIdToUse), updates);
        showMessage('User details updated successfully', 'success');
        // Reload user details to reflect changes (this will reset original values and disable button)
        await loadUserDetails(userIdToUse);
        // Reload users list to reflect changes
        loadAllUsers();
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Unknown error';
        showMessage(`Failed to update user: ${errorMessage}`, 'error');
    }
}

// Attach button handlers
document.getElementById('approve-btn')?.addEventListener('click', approveUser);
document.getElementById('reject-btn')?.addEventListener('click', rejectUser);
document.getElementById('request-picture-btn')?.addEventListener('click', requestPicture);
document.getElementById('save-user-details-btn')?.addEventListener('click', saveUserDetails);

function convertUrlsToLinks(text: string): string {
    // Regular expression to match URLs (http, https, www, or just domain names)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    
    return text.replace(urlRegex, (url) => {
        // Ensure URL has protocol
        let href = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            href = 'https://' + url;
        }
        
        // Escape HTML in the URL to prevent XSS
        const escapedUrl = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedHref = href.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" class="tooltip-link">${escapedUrl}</a>`;
    });
}

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

// Image viewer functionality
function openImageViewer(imageUrl: string) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-viewer-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh; padding: 0; background: transparent; box-shadow: none;">
                <button class="close-btn" id="close-image-viewer-modal" style="position: absolute; top: 10px; right: 10px; z-index: 1001; background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; font-size: 24px; transition: background 0.2s;">&times;</button>
                <img id="image-viewer-full-image" src="" alt="Full size image" style="max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
            </div>
        `;
        document.body.appendChild(modal);
        
        // Attach close handlers
        const closeBtn = document.getElementById('close-image-viewer-modal');
        closeBtn?.addEventListener('click', () => {
            modal?.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    const fullImage = document.getElementById('image-viewer-full-image');
    if (fullImage && modal) {
        fullImage.setAttribute('src', imageUrl);
        modal.classList.add('active');
    }
}

