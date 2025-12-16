import { eventApi, spaceApi, authApi, registrationApi, userApi, EventDTO, SpaceDTO, UserDetailsDTO, isTokenExpired } from './api';

export class App {
    private currentEvent: EventDTO | null = null;
    private isAuthenticated: boolean = false;
    private userEmail: string | null = null;
    private currentPage: 'home' | 'profile' = 'home';
    private userDetails: UserDetailsDTO | null = null;
    private pendingBookingSpaceId: number | null = null; // Store spaceId when user clicks to book while not logged in
    private isRegistering: boolean = false; // Prevent duplicate registration submissions
    private originalProfileValues: { age: number | null; location: string | null; height: string | null; size: string | null } | null = null;

    async init() {
        this.checkAuth();
        await this.loadEvent();
        if (this.isAuthenticated) {
            await this.loadUserDetails();
        }
        this.render();
        this.attachEventListeners();
        this.setupSessionExpirationHandler();
    }

    private setupSessionExpirationHandler() {
        // Listen for session expiration events from API interceptor
        window.addEventListener('session-expired', () => {
            // Update authentication state
            this.isAuthenticated = false;
            this.userEmail = null;
            this.userDetails = null;
            this.pendingBookingSpaceId = null;
            
            // Show message to user
            this.showMessage(document.getElementById('app'), 'Your session has expired. Please log in again.', 'error');
            
            // Re-render to show login buttons
            this.render();
            this.attachEventListeners();
        });
    }

    private checkAuth() {
        const token = localStorage.getItem('token');
        const email = localStorage.getItem('userEmail');
        
        // Check if token exists and is not expired
        if (token && !isTokenExpired(token)) {
            this.isAuthenticated = true;
            this.userEmail = email;
        } else {
            // Token is missing or expired, clear it
            if (token) {
                localStorage.removeItem('token');
                localStorage.removeItem('userEmail');
            }
            this.isAuthenticated = false;
            this.userEmail = null;
        }
    }

    private async loadEvent() {
        try {
            this.currentEvent = await eventApi.getUpcomingEvent();
        } catch (error) {
            console.error('Failed to load event:', error);
            this.showError('Failed to load event information');
        }
    }

    private render() {
        const app = document.getElementById('app');
        if (!app) return;

        if (this.currentPage === 'profile' && this.isAuthenticated) {
            app.innerHTML = this.renderUserDetailsPage();
            this.attachProfileEventListeners();
            this.loadUserDetails();
        } else {
            app.innerHTML = `
                <div class="container">
                    <div class="header">
                        <h1>🐕 The Velvet Den</h1>
                        <p>Join our next group event!</p>
                    </div>

                    ${this.renderAuthSection()}
                    ${this.renderEventCard()}
                </div>
            `;
            
            // Render modals outside app container so they persist across re-renders
            this.ensureModalsExist();
            
            this.attachEventListeners();
            
            // Load user details if authenticated to show status in header
            if (this.isAuthenticated && !this.userDetails) {
                this.loadUserDetails().then(() => {
                    // Update the auth section to show status badge
                    this.updateAuthSection();
                });
            }
        }
    }

    private ensureModalsExist() {
        // Check if modals already exist, if not create them
        if (!document.getElementById('registration-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderRegistrationModal());
        }
        if (!document.getElementById('login-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderLoginModal());
        }
        if (!document.getElementById('upload-picture-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderUploadPictureModal());
        }
        if (!document.getElementById('image-viewer-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderImageViewerModal());
        }
        if (!document.getElementById('booking-confirmation-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderBookingConfirmationModal());
        }
        if (!document.getElementById('cancel-booking-confirmation-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderCancelBookingConfirmationModal());
        }
        if (!document.getElementById('not-approved-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderNotApprovedModal());
        }
        if (!document.getElementById('one-space-limit-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderOneSpaceLimitModal());
        }
        if (!document.getElementById('space-already-booked-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderSpaceAlreadyBookedModal());
        }
        if (!document.getElementById('generic-error-modal')) {
            document.body.insertAdjacentHTML('beforeend', this.renderGenericErrorModal());
        }
    }

    private renderAuthSection(): string {
        if (this.isAuthenticated) {
            const statusBadge = this.getStatusBadge();
            const uploadButton = this.userDetails?.status === 'PICTURE_REQUESTED' 
                ? '<button class="btn btn-primary" id="upload-picture-header-btn" style="margin-right: 0.5rem; font-size: 0.85rem; padding: 0.25rem 0.75rem;">📷 Upload Picture</button>'
                : '';
            return `
                <div class="login-section">
                    <div class="user-info">
                        <div class="user-info-left">
                            <span>Logged in as: ${this.userEmail}</span>
                            <button class="btn btn-secondary" id="profile-btn" style="margin-right: 0.5rem;">View Profile</button>
                            <button class="logout-btn" id="logout-btn">Logout</button>
                        </div>
                        <div class="user-info-right" style="display: flex; align-items: center; gap: 0.5rem;">
                            ${uploadButton}
                            ${statusBadge}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="auth-buttons">
                <button class="btn btn-primary" id="register-btn">Register</button>
                <button class="btn btn-secondary" id="login-btn">Login</button>
            </div>
        `;
    }

    private renderEventCard(): string {
        if (!this.currentEvent) {
            return '<div class="event-card"><p>Loading event information...</p></div>';
        }

        const eventDate = new Date(this.currentEvent.dateTime);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const cancelledBadge = this.currentEvent.cancelled 
            ? '<div style="background: #f44336; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin-bottom: 1rem; display: inline-block;">Event Cancelled</div>'
            : '';
        
        return `
            <div class="event-card">
                <div class="event-info">
                    <h2>${this.currentEvent.cancelled ? 'Cancelled Event' : 'Upcoming Event'}</h2>
                    ${cancelledBadge}
                    <div class="event-details">
                        <div class="event-detail">
                            <span>📍</span>
                            <span><strong>City:</strong> ${this.currentEvent.city}</span>
                        </div>
                        <div class="event-detail">
                            <span>📅</span>
                            <span><strong>Date:</strong> ${formattedDate}</span>
                        </div>
                        <div class="event-detail">
                            <span>🕐</span>
                            <span><strong>Time:</strong> ${formattedTime}</span>
                        </div>
                    </div>
                    ${!this.currentEvent.cancelled ? `
                    <p style="margin-top: 1rem; font-size: 1.1rem;">
                        <strong>Available Spaces:</strong> ${this.currentEvent.availableSpacesCount} / ${this.currentEvent.totalSpacesCount}
                    </p>
                    ` : ''}
                </div>

                ${!this.currentEvent.cancelled ? `
                <div class="spaces-container">
                    <h3>Event Spaces</h3>
                    <div class="spaces-grid">
                        ${this.currentEvent.spaces.map(space => this.renderSpace(space)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    private renderSpace(space: SpaceDTO): string {
        const isAvailable = space.available;
        let statusClass = isAvailable ? 'available' : 'taken';
        
        // Check if user is approved and already has a booking
        const hasExistingBooking = this.isAuthenticated && this.userDetails && this.userDetails.approved && this.userDetails.bookedSpacesCount > 0;
        const isMySpace = !isAvailable && this.isAuthenticated && space.bookedBy === this.userEmail;
        
        // Check if user is rejected - PRIORITY CHECK (must come before isNotApproved)
        // REJECTED users should have greyed out cards
        // Backend returns status as enum name (e.g., "REJECTED")
        // Note: "declined" is treated as "rejected" for backward compatibility
        const userStatus = this.userDetails?.status;
        const statusUpper = userStatus ? String(userStatus).trim().toUpperCase() : '';
        
        // Check for rejected status - must be checked first and take priority
        // Also handle "declined" as "rejected" if someone types it accidentally
        const isRejected = this.isAuthenticated && 
            this.userDetails && 
            userStatus !== null && 
            userStatus !== undefined &&
            (statusUpper === 'REJECTED' || statusUpper === 'DECLINED');
        
        // If user is logged in but not approved, make available spaces appear red
        // IMPORTANT: Exclude rejected users from isNotApproved - they take priority
        const isNotApproved = this.isAuthenticated && 
            this.userDetails && 
            !isRejected &&  // Check rejected first - if rejected, can't be not-approved
            !this.userDetails.approved;
        
        if (isAvailable) {
            // PRIORITY: Check rejected FIRST - this status takes absolute priority
            if (isRejected) {
                // Rejected users should have spaces greyed out
                statusClass = 'available-disabled';
            } else if (isNotApproved) {
                // Only show not-approved if user is NOT rejected
                statusClass = 'available-not-approved';
            } else if (hasExistingBooking && !isMySpace) {
                // If user already has a booking and this is not their space, grey it out
                statusClass = 'available-disabled';
            }
        }
        
        // Add 'my-space' class if it's the user's booked space
        if (isMySpace) {
            statusClass += ' my-space';
        }
        
        let statusText: string;
        if (isAvailable) {
            if (isRejected) {
                statusText = 'Not Available (Account Rejected)';
            } else if (isNotApproved) {
                statusText = 'Not Available (Account In Review)';
            } else if (hasExistingBooking && !isMySpace) {
                statusText = 'Already Booked (One Space Limit)';
            } else {
                statusText = 'Available';
            }
        } else {
            // Space is booked
            if (!this.isAuthenticated) {
                // Not logged in: just show "Booked"
                statusText = 'Booked';
            } else if (space.bookedBy === this.userEmail) {
                // Logged in and it's their space
                statusText = 'Your space';
            } else {
                // Logged in but not their space
                statusText = 'Booked';
            }
        }
        
        const colorClass = `color-${space.color.toLowerCase()}`;
        const cancelButton = isMySpace 
            ? `<button class="btn-cancel-booking" data-space-id="${space.id}" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Cancel Booking</button>`
            : '';

        return `
            <div class="space-card ${statusClass}" data-space-id="${space.id}" data-available="${isAvailable}" data-not-approved="${isNotApproved && isAvailable}" data-rejected="${isRejected && isAvailable}" data-disabled="${(hasExistingBooking || isRejected) && isAvailable && !isMySpace}">
                <div class="space-name">${space.name}</div>
                <div class="space-color ${colorClass}"></div>
                <div class="space-status">${statusText}</div>
                ${cancelButton}
            </div>
        `;
    }

    private renderRegistrationModal(): string {
        return `
            <div id="registration-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Register</h2>
                        <button class="close-btn" id="close-registration-modal">&times;</button>
                    </div>
                    <div id="registration-message"></div>
                    <form id="registration-form">
                        <div class="form-group">
                            <label for="reg-email">Email</label>
                            <input type="email" id="reg-email" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-password">Password</label>
                            <input type="password" id="reg-password" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-firstname">First Name</label>
                            <input type="text" id="reg-firstname" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-lastname">Last Name</label>
                            <input type="text" id="reg-lastname" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-image">Verification Image (Proof of identity and fitness)</label>
                            <input type="file" id="reg-image" accept="image/*" required>
                            <small style="color: #666; margin-top: 0.5rem; display: block;">
                                Please upload a photo showing your face and demonstrating good physical fitness.
                            </small>
                        </div>
                        <button type="submit" class="btn btn-primary">Submit Registration</button>
                    </form>
                </div>
            </div>
        `;
    }

    private renderUploadPictureModal(): string {
        return `
            <div id="upload-picture-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Upload New Verification Picture</h2>
                        <button class="close-btn" id="close-upload-picture-modal">&times;</button>
                    </div>
                    <div id="upload-picture-message"></div>
                    <form id="upload-picture-form">
                        <div class="form-group">
                            <label for="upload-image">Verification Image (Proof of identity and fitness)</label>
                            <input type="file" id="upload-image" accept="image/*" required>
                            <small style="color: #666; margin-top: 0.5rem; display: block;">
                                Please upload a new photo showing your face and demonstrating good physical fitness.
                            </small>
                        </div>
                        <button type="submit" class="btn btn-primary">Upload Picture</button>
                    </form>
                </div>
            </div>
        `;
    }

    private renderImageViewerModal(): string {
        return `
            <div id="image-viewer-modal" class="modal">
                <div class="modal-content" style="max-width: 90vw; max-height: 90vh; padding: 0; background: transparent; box-shadow: none;">
                    <button class="close-btn" id="close-image-viewer-modal" style="position: absolute; top: 10px; right: 10px; z-index: 1001; background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; font-size: 24px; transition: background 0.2s;">&times;</button>
                    <img id="image-viewer-full-image" src="" alt="Full size image" style="max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                </div>
            </div>
        `;
    }

    private renderBookingConfirmationModal(): string {
        return `
            <div id="booking-confirmation-modal" class="modal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Confirm Booking</h2>
                        <button class="close-btn" id="close-booking-confirmation-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <p style="font-size: 1.1rem; margin-bottom: 1rem;">Are you sure you want to book this space?</p>
                        <div id="booking-confirmation-details" style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                            <!-- Space details will be inserted here -->
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn btn-secondary" id="cancel-booking-btn" style="width: auto;">Cancel</button>
                            <button class="btn btn-primary" id="confirm-booking-btn" style="width: auto;">Confirm Booking</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderCancelBookingConfirmationModal(): string {
        return `
            <div id="cancel-booking-confirmation-modal" class="modal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Cancel Booking</h2>
                        <button class="close-btn" id="close-cancel-booking-confirmation-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <p style="font-size: 1.1rem; margin-bottom: 1rem;">Are you sure you want to cancel this booking?</p>
                        <div id="cancel-booking-confirmation-details" style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                            <!-- Space details will be inserted here -->
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn btn-secondary" id="keep-booking-btn" style="width: auto;">Keep Booking</button>
                            <button class="btn btn-primary" id="confirm-cancel-booking-btn" style="width: auto; background: #f44336;">Cancel Booking</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderNotApprovedModal(): string {
        return `
            <div id="not-approved-modal" class="modal">
                <div class="modal-content" style="max-width: 450px; text-align: center;">
                    <div class="modal-header">
                        <h2 style="color: #ff9800;">Account Not Approved</h2>
                        <button class="close-btn" id="close-not-approved-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⏳</div>
                        <p style="font-size: 1.1rem; margin-bottom: 1rem; color: #333;">
                            Your account is currently <strong>in review</strong> and has not been approved yet.
                        </p>
                        <p style="font-size: 0.95rem; margin-bottom: 1.5rem; color: #666;">
                            Only approved users can book spaces. Please wait for your account to be reviewed and approved by an administrator.
                        </p>
                        <div style="background: #fff3cd; border-left: 4px solid #ff9800; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left;">
                            <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                                <strong>What's next?</strong><br>
                                Your registration request is being reviewed. Once approved, you'll be able to book spaces for events.
                            </p>
                        </div>
                        <button class="btn btn-primary" id="close-not-approved-btn" style="width: auto; min-width: 120px;">OK</button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderLoginModal(): string {
        return `
            <div id="login-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Login</h2>
                        <button class="close-btn" id="close-login-modal">&times;</button>
                    </div>
                    <div id="login-message"></div>
                    <form id="login-form">
                        <div class="form-group">
                            <label for="login-email">Email</label>
                            <input type="email" id="login-email" required>
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Login</button>
                    </form>
                </div>
            </div>
        `;
    }

    private renderOneSpaceLimitModal(): string {
        return `
            <div id="one-space-limit-modal" class="modal">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-header">
                        <h2 style="color: #ff9800;">One Space Limit</h2>
                        <button class="close-btn" id="close-one-space-limit-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <p id="one-space-limit-message" style="margin-bottom: 1.5rem;">You can only book one space at a time. Please cancel your existing booking to book a different space.</p>
                        <button class="btn btn-primary" id="close-one-space-limit-btn" style="width: auto; min-width: 120px;">OK</button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderSpaceAlreadyBookedModal(): string {
        return `
            <div id="space-already-booked-modal" class="modal">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-header" style="justify-content: center;">
                        <h2 style="color: #f44336;">Space Unavailable</h2>
                        <button class="close-btn" id="close-space-already-booked-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🚫</div>
                        <p style="margin-bottom: 1.5rem;">This space has already been booked by another user. Please select a different space.</p>
                        <button class="btn btn-primary" id="close-space-already-booked-btn" style="width: auto; min-width: 120px;">OK</button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderGenericErrorModal(): string {
        return `
            <div id="generic-error-modal" class="modal">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-header" style="justify-content: center;">
                        <h2 style="color: #f44336;">Error</h2>
                        <button class="close-btn" id="close-generic-error-modal">&times;</button>
                    </div>
                    <div style="padding: 1rem 0;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                        <p id="generic-error-message" style="margin-bottom: 1.5rem;">An error occurred. Please try again.</p>
                        <button class="btn btn-primary" id="close-generic-error-btn" style="width: auto; min-width: 120px;">OK</button>
                    </div>
                </div>
            </div>
        `;
    }

    private attachEventListeners() {
        // Registration modal
        const registerBtn = document.getElementById('register-btn');
        const registrationModal = document.getElementById('registration-modal');
        const closeRegistrationModal = document.getElementById('close-registration-modal');
        const registrationForm = document.getElementById('registration-form') as HTMLFormElement;

        registerBtn?.addEventListener('click', () => {
            // Clear any previous error messages and reset the form when opening the modal
            const messageDiv = document.getElementById('registration-message');
            if (messageDiv) {
                messageDiv.innerHTML = '';
                messageDiv.className = '';
            }
            if (registrationForm) {
                registrationForm.reset();
            }
            registrationModal?.classList.add('active');
        });

        closeRegistrationModal?.addEventListener('click', () => {
            // Clear error messages and reset form when closing the modal
            const messageDiv = document.getElementById('registration-message');
            if (messageDiv) {
                messageDiv.innerHTML = '';
                messageDiv.className = '';
            }
            if (registrationForm) {
                registrationForm.reset();
            }
            registrationModal?.classList.remove('active');
        });

        // Prevent duplicate event listeners by checking if form already has data attribute
        if (registrationForm && !registrationForm.hasAttribute('data-listener-attached')) {
            registrationForm.setAttribute('data-listener-attached', 'true');
            registrationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Prevent other listeners from firing
                if (!this.isRegistering) {
                    await this.handleRegistration();
                }
            });
        }

        // Login modal
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
        const closeLoginModal = document.getElementById('close-login-modal');
        const loginForm = document.getElementById('login-form') as HTMLFormElement;

        loginBtn?.addEventListener('click', () => {
            // Clear any previous error messages and reset the form when opening the modal
            const messageDiv = document.getElementById('login-message');
            if (messageDiv) {
                messageDiv.innerHTML = '';
                messageDiv.className = '';
            }
            if (loginForm) {
                loginForm.reset();
            }
            loginModal?.classList.add('active');
        });

        closeLoginModal?.addEventListener('click', () => {
            // Clear error messages and reset form when closing the modal
            const messageDiv = document.getElementById('login-message');
            if (messageDiv) {
                messageDiv.innerHTML = '';
                messageDiv.className = '';
            }
            if (loginForm) {
                loginForm.reset();
            }
            loginModal?.classList.remove('active');
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Profile button
        const profileBtn = document.getElementById('profile-btn');
        profileBtn?.addEventListener('click', () => {
            this.currentPage = 'profile';
            this.render();
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Upload picture button in header
        const uploadPictureHeaderBtn = document.getElementById('upload-picture-header-btn');
        uploadPictureHeaderBtn?.addEventListener('click', () => {
            const uploadModal = document.getElementById('upload-picture-modal');
            if (uploadModal) {
                // Clear any previous messages and reset form
                const messageDiv = document.getElementById('upload-picture-message');
                if (messageDiv) {
                    messageDiv.innerHTML = '';
                    messageDiv.className = '';
                }
                const form = document.getElementById('upload-picture-form') as HTMLFormElement;
                if (form) {
                    form.reset();
                }
                uploadModal.classList.add('active');
            }
        });

        // Upload picture form submission (global listener)
        const uploadPictureForm = document.getElementById('upload-picture-form') as HTMLFormElement;
        if (uploadPictureForm && !uploadPictureForm.hasAttribute('data-listener-attached')) {
            uploadPictureForm.setAttribute('data-listener-attached', 'true');
            uploadPictureForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleUploadPicture();
            });
        }

        // Close upload picture modal
        const closeUploadPictureModal = document.getElementById('close-upload-picture-modal');
        closeUploadPictureModal?.addEventListener('click', () => {
            const uploadModal = document.getElementById('upload-picture-modal');
            const messageDiv = document.getElementById('upload-picture-message');
            if (messageDiv) {
                messageDiv.innerHTML = '';
                messageDiv.className = '';
            }
            const form = document.getElementById('upload-picture-form') as HTMLFormElement;
            if (form) {
                form.reset();
            }
            uploadModal?.classList.remove('active');
        });

        // Close upload picture modal when clicking outside
        const uploadModal = document.getElementById('upload-picture-modal');
        uploadModal?.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                const messageDiv = document.getElementById('upload-picture-message');
                if (messageDiv) {
                    messageDiv.innerHTML = '';
                    messageDiv.className = '';
                }
                const form = document.getElementById('upload-picture-form') as HTMLFormElement;
                if (form) {
                    form.reset();
                }
                uploadModal.classList.remove('active');
            }
        });

        // Image viewer modal handlers
        const imageViewerModal = document.getElementById('image-viewer-modal');
        const closeImageViewerModal = document.getElementById('close-image-viewer-modal');
        
        closeImageViewerModal?.addEventListener('click', () => {
            imageViewerModal?.classList.remove('active');
        });
        
        imageViewerModal?.addEventListener('click', (e) => {
            if (e.target === imageViewerModal) {
                imageViewerModal.classList.remove('active');
            }
        });

        // Space booking
        document.querySelectorAll('.space-card.available, .space-card.available-not-approved, .space-card.available-disabled').forEach(card => {
            card.addEventListener('click', async (e) => {
                // Don't trigger if a blocking modal is active (confirmation modals, login, or registration)
                // Only block interactive modals, not informational ones that can be dismissed
                const blockingModalIds = ['booking-confirmation-modal', 'cancel-booking-confirmation-modal', 'login-modal', 'registration-modal', 'upload-picture-modal'];
                const activeBlockingModal = blockingModalIds.some(id => {
                    const modal = document.getElementById(id);
                    return modal?.classList.contains('active');
                });
                if (activeBlockingModal) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                
                // Don't trigger if clicking on a button
                if ((e.target as HTMLElement).tagName === 'BUTTON') {
                    return;
                }
                
                const target = e.currentTarget as HTMLElement;
                const spaceId = parseInt(target.dataset.spaceId || '0');
                const isAvailable = target.dataset.available === 'true';
                const isNotApproved = target.dataset.notApproved === 'true';
                const isRejected = target.dataset.rejected === 'true';
                const isDisabled = target.dataset.disabled === 'true';
                
                // If user is rejected, prevent booking (spaces are already greyed out)
                if (isRejected && this.isAuthenticated) {
                    // Don't allow rejected users to book spaces
                    return;
                }
                
                // If user is not approved, show warning modal instead
                if (isNotApproved && this.isAuthenticated) {
                    const notApprovedModal = document.getElementById('not-approved-modal');
                    notApprovedModal?.classList.add('active');
                    return;
                }
                
                // If user already has a booking, prevent booking another space
                if (isDisabled && this.isAuthenticated && !isRejected) {
                    // Show the one space limit modal
                    const oneSpaceLimitModal = document.getElementById('one-space-limit-modal');
                    oneSpaceLimitModal?.classList.add('active');
                    return;
                }
                
                if (isAvailable && this.isAuthenticated && this.currentEvent) {
                    await this.handleBookSpace(spaceId);
                } else if (!this.isAuthenticated && isAvailable) {
                    // Store the spaceId for booking after login
                    this.pendingBookingSpaceId = spaceId;
                    // Open login modal
                    const loginModal = document.getElementById('login-modal');
                    loginModal?.classList.add('active');
                }
            });
        });

        // Cancel booking buttons
        document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent triggering the card click
                const spaceId = parseInt((e.target as HTMLElement).dataset.spaceId || '0');
                await this.handleCancelBooking(spaceId);
            });
        });

        // Booking confirmation modal
        const bookingConfirmationModal = document.getElementById('booking-confirmation-modal');
        const closeBookingConfirmationModal = document.getElementById('close-booking-confirmation-modal');
        const cancelBookingBtn = document.getElementById('cancel-booking-btn');
        const confirmBookingBtn = document.getElementById('confirm-booking-btn');

        closeBookingConfirmationModal?.addEventListener('click', () => {
            bookingConfirmationModal?.classList.remove('active');
        });

        cancelBookingBtn?.addEventListener('click', () => {
            bookingConfirmationModal?.classList.remove('active');
        });

        confirmBookingBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Prevent multiple clicks
            if ((confirmBookingBtn as HTMLButtonElement).disabled) {
                return;
            }
            (confirmBookingBtn as HTMLButtonElement).disabled = true;
            this.confirmBooking().finally(() => {
                (confirmBookingBtn as HTMLButtonElement).disabled = false;
            });
        });

        // Close modal when clicking outside
        bookingConfirmationModal?.addEventListener('click', (e) => {
            if (e.target === bookingConfirmationModal) {
                bookingConfirmationModal.classList.remove('active');
            }
        });

        // Cancel booking confirmation modal
        const cancelBookingConfirmationModal = document.getElementById('cancel-booking-confirmation-modal');
        const closeCancelBookingConfirmationModal = document.getElementById('close-cancel-booking-confirmation-modal');
        const keepBookingBtn = document.getElementById('keep-booking-btn');
        const confirmCancelBookingBtn = document.getElementById('confirm-cancel-booking-btn');

        closeCancelBookingConfirmationModal?.addEventListener('click', () => {
            cancelBookingConfirmationModal?.classList.remove('active');
        });

        keepBookingBtn?.addEventListener('click', () => {
            cancelBookingConfirmationModal?.classList.remove('active');
        });

        confirmCancelBookingBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Prevent multiple clicks
            if ((confirmCancelBookingBtn as HTMLButtonElement).disabled) {
                return;
            }
            (confirmCancelBookingBtn as HTMLButtonElement).disabled = true;
            this.confirmCancelBooking().finally(() => {
                (confirmCancelBookingBtn as HTMLButtonElement).disabled = false;
            });
        });

        // Close modal when clicking outside
        cancelBookingConfirmationModal?.addEventListener('click', (e) => {
            if (e.target === cancelBookingConfirmationModal) {
                cancelBookingConfirmationModal.classList.remove('active');
            }
        });

        // Not approved modal
        const notApprovedModal = document.getElementById('not-approved-modal');
        const closeNotApprovedModal = document.getElementById('close-not-approved-modal');
        const closeNotApprovedBtn = document.getElementById('close-not-approved-btn');

        closeNotApprovedModal?.addEventListener('click', () => {
            notApprovedModal?.classList.remove('active');
        });

        closeNotApprovedBtn?.addEventListener('click', () => {
            notApprovedModal?.classList.remove('active');
        });

        // Close modal when clicking outside
        notApprovedModal?.addEventListener('click', (e) => {
            if (e.target === notApprovedModal) {
                notApprovedModal.classList.remove('active');
            }
        });

        // One space limit modal
        const oneSpaceLimitModal = document.getElementById('one-space-limit-modal');
        const closeOneSpaceLimitModal = document.getElementById('close-one-space-limit-modal');
        const closeOneSpaceLimitBtn = document.getElementById('close-one-space-limit-btn');

        closeOneSpaceLimitModal?.addEventListener('click', () => {
            oneSpaceLimitModal?.classList.remove('active');
        });

        closeOneSpaceLimitBtn?.addEventListener('click', () => {
            oneSpaceLimitModal?.classList.remove('active');
        });

        // Close modal when clicking outside
        oneSpaceLimitModal?.addEventListener('click', (e) => {
            if (e.target === oneSpaceLimitModal) {
                oneSpaceLimitModal.classList.remove('active');
            }
        });

        // Space already booked modal
        const spaceAlreadyBookedModal = document.getElementById('space-already-booked-modal');
        const closeSpaceAlreadyBookedModal = document.getElementById('close-space-already-booked-modal');
        const closeSpaceAlreadyBookedBtn = document.getElementById('close-space-already-booked-btn');

        closeSpaceAlreadyBookedModal?.addEventListener('click', () => {
            spaceAlreadyBookedModal?.classList.remove('active');
        });

        closeSpaceAlreadyBookedBtn?.addEventListener('click', () => {
            spaceAlreadyBookedModal?.classList.remove('active');
        });

        // Close modal when clicking outside
        spaceAlreadyBookedModal?.addEventListener('click', (e) => {
            if (e.target === spaceAlreadyBookedModal) {
                spaceAlreadyBookedModal.classList.remove('active');
            }
        });

        // Generic error modal
        const genericErrorModal = document.getElementById('generic-error-modal');
        const closeGenericErrorModal = document.getElementById('close-generic-error-modal');
        const closeGenericErrorBtn = document.getElementById('close-generic-error-btn');

        closeGenericErrorModal?.addEventListener('click', () => {
            genericErrorModal?.classList.remove('active');
        });

        closeGenericErrorBtn?.addEventListener('click', () => {
            genericErrorModal?.classList.remove('active');
        });

        // Close modal when clicking outside
        genericErrorModal?.addEventListener('click', (e) => {
            if (e.target === genericErrorModal) {
                genericErrorModal.classList.remove('active');
            }
        });
    }

    private async handleRegistration() {
        // Prevent duplicate submissions
        if (this.isRegistering) {
            return;
        }

        const messageDiv = document.getElementById('registration-message');
        const form = document.getElementById('registration-form') as HTMLFormElement;
        
        if (!messageDiv || !form) return;

        const email = (document.getElementById('reg-email') as HTMLInputElement).value;
        const password = (document.getElementById('reg-password') as HTMLInputElement).value;
        const firstName = (document.getElementById('reg-firstname') as HTMLInputElement).value;
        const lastName = (document.getElementById('reg-lastname') as HTMLInputElement).value;
        const imageFile = (document.getElementById('reg-image') as HTMLInputElement).files?.[0];

        if (!imageFile) {
            this.showMessage(messageDiv, 'Please select a verification image', 'error');
            return;
        }

        // Set flag to prevent duplicate submissions and disable submit button
        this.isRegistering = true;
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Registering...';
        }

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            formData.append('firstName', firstName);
            formData.append('lastName', lastName);
            formData.append('verificationImage', imageFile);

            await registrationApi.register(formData);
            
            // Registration successful - close registration modal and open login modal with success message
            form.reset();
            
            // Close registration modal
            const registrationModal = document.getElementById('registration-modal');
            registrationModal?.classList.remove('active');
            
            // Open login modal and show success message
            const loginModal = document.getElementById('login-modal');
            const loginMessageDiv = document.getElementById('login-message');
            
            if (loginModal && loginMessageDiv) {
                // Clear any previous messages and show success message
                loginMessageDiv.innerHTML = '';
                loginMessageDiv.className = '';
                this.showMessage(loginMessageDiv, 'Registration successful! Please log in to continue.', 'success');
                
                // Pre-fill the email field with the registered email
                const loginEmailInput = document.getElementById('login-email') as HTMLInputElement;
                if (loginEmailInput) {
                    loginEmailInput.value = email;
                }
                
                // Open the login modal
                loginModal.classList.add('active');
            }
        } catch (error: any) {
            // Registration failed - show error and do NOT attempt login
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Registration failed. Please try again.';
            this.showMessage(messageDiv, errorMsg, 'error');
        } finally {
            // Always reset the flag and re-enable submit button
            this.isRegistering = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            }
        }
    }

    private async handleLogin() {
        const messageDiv = document.getElementById('login-message');
        const form = document.getElementById('login-form') as HTMLFormElement;
        
        if (!messageDiv || !form) return;

        const email = (document.getElementById('login-email') as HTMLInputElement).value;
        const password = (document.getElementById('login-password') as HTMLInputElement).value;

        try {
            const response = await authApi.login({ email, password });
            localStorage.setItem('token', response.token);
            localStorage.setItem('userEmail', response.email);
            this.isAuthenticated = true;
            this.userEmail = response.email;

            // Load user details to get status
            await this.loadUserDetails();

            form.reset();
            
            // Close modal
            const modal = document.getElementById('login-modal');
            modal?.classList.remove('active');
            
            // Check if there's a pending booking to resume
            if (this.pendingBookingSpaceId !== null) {
                const spaceId = this.pendingBookingSpaceId;
                this.pendingBookingSpaceId = null; // Clear pending booking
                
                // Render first to update the UI
                this.render();
                this.attachEventListeners();
                
                // Check if user is approved before proceeding with booking
                if (!this.userDetails?.approved) {
                    // User is not approved - show warning modal instead
                    setTimeout(() => {
                        const notApprovedModal = document.getElementById('not-approved-modal');
                        notApprovedModal?.classList.add('active');
                    }, 100);
                } else {
                    // User is approved - proceed with booking
                    setTimeout(async () => {
                        if (this.currentEvent) {
                            await this.handleBookSpace(spaceId);
                        }
                    }, 100);
                }
            } else {
                // Normal login flow - just render
                this.render();
                this.attachEventListeners();
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
            this.showMessage(messageDiv, errorMsg, 'error');
            form.reset(); // Clear the form on invalid credentials
        }
    }

    private handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        this.isAuthenticated = false;
        this.userEmail = null;
        this.pendingBookingSpaceId = null; // Clear any pending booking on logout
        this.render();
        this.attachEventListeners();
    }

    private async handleBookSpace(spaceId: number) {
        if (!this.currentEvent) return;

        // Find the space details
        const space = this.currentEvent.spaces.find(s => s.id === spaceId);
        if (!space) return;

        // Show confirmation modal with space details
        const modal = document.getElementById('booking-confirmation-modal');
        const detailsDiv = document.getElementById('booking-confirmation-details');
        
        if (modal && detailsDiv) {
            // Populate space details
            const colorClass = `color-${space.color.toLowerCase()}`;
            detailsDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="space-color ${colorClass}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #333;"></div>
                    <div>
                        <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 0.25rem;">${space.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${space.color} space</div>
                    </div>
                </div>
            `;

            // Store the spaceId for confirmation
            (modal as any).pendingSpaceId = spaceId;

            // Show modal
            modal.classList.add('active');
        }
    }

    private async confirmBooking() {
        const modal = document.getElementById('booking-confirmation-modal');
        if (!modal || !this.currentEvent) return;

        const spaceId = (modal as any).pendingSpaceId;
        if (!spaceId) return;

        // Close confirmation modal first
        modal.classList.remove('active');
        
        // Close any other active modals to prevent conflicts
        document.querySelectorAll('.modal.active').forEach(m => {
            if (m.id !== 'booking-confirmation-modal') {
                (m as HTMLElement).classList.remove('active');
            }
        });

        try {
            await spaceApi.bookSpace(this.currentEvent.id, spaceId);
            
            // Remove any existing booking success modal first
            const existingModal = document.getElementById('booking-success-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Ensure no other modals are active
            document.querySelectorAll('.modal.active').forEach(m => {
                (m as HTMLElement).classList.remove('active');
            });
            
            // Show success message
            const successModal = document.createElement('div');
            successModal.className = 'modal active';
            successModal.id = 'booking-success-modal';
            
            const closeSuccessModal = () => {
                if (successModal.parentNode) {
                    successModal.parentNode.removeChild(successModal);
                }
            };
            
            successModal.innerHTML = `
                <div class="modal-content" style="max-width: 350px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #4caf50;">✓</div>
                    <h2 style="color: #4caf50; margin-bottom: 1rem;">Booking Confirmed!</h2>
                    <p style="margin-bottom: 1.5rem;">Your space has been booked successfully.</p>
                    <button class="btn btn-primary" id="booking-success-ok-btn">OK</button>
                </div>
            `;
            document.body.appendChild(successModal);
            
            // Add click handler to OK button
            const okBtn = successModal.querySelector('#booking-success-ok-btn');
            okBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeSuccessModal();
                
                // Now that modal is closed, re-render to update the UI
                this.render();
                this.attachEventListeners();
                
                // Prevent any further event handling
                return false;
            }, { once: true });
            
            // Prevent modal from closing when clicking inside the modal content
            const modalContent = successModal.querySelector('.modal-content');
            modalContent?.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Close modal when clicking outside (on backdrop)
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    closeSuccessModal();
                    // Re-render when modal is closed via backdrop click
                    this.render();
                    this.attachEventListeners();
                }
            });

            // Reload user details to update bookedSpacesCount
            await this.loadUserDetails();
            
            // Reload event data (but don't re-render yet - wait for user to close success modal)
            await this.loadEvent();
        } catch (error: any) {
            // Ensure no success modal is shown on error
            const existingSuccessModal = document.getElementById('booking-success-modal');
            if (existingSuccessModal) {
                existingSuccessModal.remove();
            }
            
            // Close any other active modals
            document.querySelectorAll('.modal.active').forEach(m => {
                (m as HTMLElement).classList.remove('active');
            });
            
            const errorMsg = error.response?.data?.error || 'Failed to book space. Please try again.';
            
            // Check if it's a non-approved user error
            if (errorMsg.toLowerCase().includes('approved') || errorMsg.toLowerCase().includes('only approved')) {
                // Show custom modal for non-approved users
                const notApprovedModal = document.getElementById('not-approved-modal');
                notApprovedModal?.classList.add('active');
            } else if (errorMsg.toLowerCase().includes('one space') || errorMsg.toLowerCase().includes('only book one')) {
                // Show the one space limit modal with custom message
                const oneSpaceLimitModal = document.getElementById('one-space-limit-modal');
                const messageElement = document.getElementById('one-space-limit-message');
                if (messageElement) {
                    messageElement.textContent = errorMsg;
                }
                oneSpaceLimitModal?.classList.add('active');
            } else if (errorMsg.toLowerCase().includes('already booked') || errorMsg.toLowerCase().includes('space is already')) {
                // Show space already booked modal
                const spaceAlreadyBookedModal = document.getElementById('space-already-booked-modal');
                spaceAlreadyBookedModal?.classList.add('active');
            } else {
                // Show generic error modal for other errors
                const genericErrorModal = document.getElementById('generic-error-modal');
                const messageElement = document.getElementById('generic-error-message');
                if (messageElement) {
                    messageElement.textContent = errorMsg;
                }
                genericErrorModal?.classList.add('active');
            }
        }
    }

    private async handleCancelBooking(spaceId: number) {
        if (!this.currentEvent) return;

        // Find the space details
        const space = this.currentEvent.spaces.find(s => s.id === spaceId);
        if (!space) return;

        // Show confirmation modal with space details
        const modal = document.getElementById('cancel-booking-confirmation-modal');
        const detailsDiv = document.getElementById('cancel-booking-confirmation-details');
        
        if (modal && detailsDiv) {
            // Populate space details
            const colorClass = `color-${space.color.toLowerCase()}`;
            detailsDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="space-color ${colorClass}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #333;"></div>
                    <div>
                        <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 0.25rem;">${space.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${space.color} space</div>
                    </div>
                </div>
            `;

            // Store the spaceId for confirmation
            (modal as any).pendingSpaceId = spaceId;

            // Show modal
            modal.classList.add('active');
        }
    }

    private async confirmCancelBooking() {
        const modal = document.getElementById('cancel-booking-confirmation-modal');
        if (!modal) {
            return;
        }

        const spaceId = (modal as any).pendingSpaceId;
        if (!spaceId) {
            return;
        }

        // Close confirmation modal first
        modal.classList.remove('active');
        
        // Close any other active modals to prevent conflicts
        document.querySelectorAll('.modal.active').forEach(m => {
            if (m.id !== 'cancel-booking-confirmation-modal') {
                (m as HTMLElement).classList.remove('active');
            }
        });

        try {
            await spaceApi.cancelBooking(spaceId);
            
            // Remove any existing cancel success modal first
            const existingModal = document.getElementById('cancel-booking-success-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Ensure no other modals are active
            document.querySelectorAll('.modal.active').forEach(m => {
                (m as HTMLElement).classList.remove('active');
            });
            
            // Show success message
            const successModal = document.createElement('div');
            successModal.className = 'modal active';
            successModal.id = 'cancel-booking-success-modal';
            
            const closeSuccessModal = () => {
                if (successModal.parentNode) {
                    successModal.parentNode.removeChild(successModal);
                }
            };
            
            successModal.innerHTML = `
                <div class="modal-content" style="max-width: 350px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #4caf50;">✓</div>
                    <h2 style="color: #4caf50; margin-bottom: 1rem;">Booking Cancelled</h2>
                    <p style="margin-bottom: 1.5rem;">Your booking has been cancelled successfully.</p>
                    <button class="btn btn-primary" id="cancel-success-ok-btn">OK</button>
                </div>
            `;
            document.body.appendChild(successModal);
            
            // Add click handler to OK button
            const okBtn = successModal.querySelector('#cancel-success-ok-btn');
            okBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeSuccessModal();
                
                // Now that modal is closed, re-render to update the UI
                this.render();
                this.attachEventListeners();
                
                // Prevent any further event handling
                return false;
            }, { once: true });
            
            // Prevent modal from closing when clicking inside the modal content
            const modalContent = successModal.querySelector('.modal-content');
            modalContent?.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Close modal when clicking outside (on backdrop)
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    closeSuccessModal();
                    // Re-render when modal is closed via backdrop click
                    this.render();
                    this.attachEventListeners();
                }
            });

            // Reload user details to update bookedSpacesCount
            await this.loadUserDetails();
            
            // Reload event data (but don't re-render yet - wait for user to close success modal)
            await this.loadEvent();
        } catch (error: any) {
            // Ensure no success modal is shown on error
            const existingSuccessModal = document.getElementById('cancel-booking-success-modal');
            if (existingSuccessModal) {
                existingSuccessModal.remove();
            }
            
            // Close any other active modals
            document.querySelectorAll('.modal.active').forEach(m => {
                (m as HTMLElement).classList.remove('active');
            });
            
            const errorMsg = error.response?.data?.error || error.message || 'Failed to cancel booking. Please try again.';
            // Show generic error modal
            const genericErrorModal = document.getElementById('generic-error-modal');
            const messageElement = document.getElementById('generic-error-message');
            if (messageElement) {
                messageElement.textContent = errorMsg;
            }
            genericErrorModal?.classList.add('active');
        }
    }

    private showMessage(container: HTMLElement, message: string, type: 'success' | 'error') {
        const className = type === 'success' ? 'success-message' : 'error-message';
        container.innerHTML = `<div class="${className}">${message}</div>`;
    }

    private showError(message: string) {
        const app = document.getElementById('app');
        if (app) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            app.appendChild(errorDiv);
        }
    }

    private renderUserDetailsPage(): string {
        return `
            <div class="container">
                <div class="header">
                    <h1>👤 User Profile</h1>
                </div>

                <div class="event-card">
                    <div style="margin-bottom: 1.5rem;">
                        <button class="btn btn-secondary" id="back-btn">← Back to Home</button>
                    </div>
                    <div id="user-details-content">
                        <p>Loading user details...</p>
                    </div>
                </div>
            </div>
        `;
    }

    private async loadUserDetails() {
        try {
            this.userDetails = await userApi.getCurrentUser();
            
            // If we're on the profile page, render the details
            const contentDiv = document.getElementById('user-details-content');
            if (contentDiv) {
                this.renderUserDetails(contentDiv);
            }
        } catch (error: any) {
            const contentDiv = document.getElementById('user-details-content');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div class="error-message">
                        Failed to load user details: ${error.response?.data?.error || error.message}
                    </div>
                `;
            }
        }
    }

    private getStatusBadge(): string {
        if (!this.userDetails) {
            return '';
        }

        if (this.userDetails.approved) {
            return '<span style="background: #4caf50; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">✓ APPROVED</span>';
        } else if (this.userDetails.status === 'PICTURE_REQUESTED') {
            return '<span style="background: #2196f3; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">📷 PICTURE REQUESTED</span>';
        } else if (this.userDetails.status === 'IN_REVIEW') {
            return '<span style="background: #ff9800; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">⏳ IN REVIEW</span>';
        } else if (this.userDetails.status === 'REJECTED') {
            return '<span style="background: #f44336; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">✗ REJECTED</span>';
        }
        
        return '';
    }

    private updateAuthSection() {
        // Find the auth section (either .login-section or .auth-buttons)
        const loginSection = document.querySelector('.login-section');
        const authButtons = document.querySelector('.auth-buttons');
        const targetElement = loginSection || authButtons;
        
        if (targetElement) {
            // Replace only the target element, not its parent
            targetElement.outerHTML = this.renderAuthSection();
            // Re-attach event listeners for buttons in the auth section
            const profileBtn = document.getElementById('profile-btn');
            const uploadPictureHeaderBtn = document.getElementById('upload-picture-header-btn');
            const logoutBtn = document.getElementById('logout-btn');
            
            profileBtn?.addEventListener('click', () => {
                this.currentPage = 'profile';
                this.render();
            });
            
            logoutBtn?.addEventListener('click', () => {
                this.handleLogout();
            });

            uploadPictureHeaderBtn?.addEventListener('click', () => {
                const uploadModal = document.getElementById('upload-picture-modal');
                if (uploadModal) {
                    // Clear any previous messages and reset form
                    const messageDiv = document.getElementById('upload-picture-message');
                    if (messageDiv) {
                        messageDiv.innerHTML = '';
                        messageDiv.className = '';
                    }
                    const form = document.getElementById('upload-picture-form') as HTMLFormElement;
                    if (form) {
                        form.reset();
                    }
                    uploadModal.classList.add('active');
                }
            });
        }
    }

    private renderUserDetails(container: HTMLElement) {
        if (!this.userDetails) return;

        const createdDate = new Date(this.userDetails.createdAt);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let statusBadge: string;
        if (this.userDetails.approved) {
            statusBadge = '<span style="background: #4caf50; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">✓ APPROVED</span>';
        } else if (this.userDetails.status === 'PICTURE_REQUESTED') {
            statusBadge = '<span style="background: #2196f3; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; white-space: nowrap;">📷 PICTURE REQUESTED</span>';
        } else if (this.userDetails.status === 'REJECTED') {
            statusBadge = '<span style="background: #f44336; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">✗ REJECTED</span>';
        } else {
            statusBadge = '<span style="background: #ff9800; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600;">⏳ IN REVIEW</span>';
        }

        container.innerHTML = `
            <div class="user-profile">
                <div class="profile-header">
                    <h2>${this.userDetails.firstName} ${this.userDetails.lastName}</h2>
                    ${statusBadge}
                </div>

                <div class="profile-details">
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${this.userDetails.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">${this.userDetails.status}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Account Created:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Booked Spaces:</span>
                        <span class="detail-value">${this.userDetails.bookedSpacesCount}</span>
                    </div>
                    <div class="detail-row" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
                        <span class="detail-label" style="display: block; margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem;">Additional Information</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Age:</span>
                        <input type="number" id="profile-age" min="0" placeholder="Enter age" value="${this.userDetails.age || ''}" style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; width: 200px;">
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Location:</span>
                        <input type="text" id="profile-location" placeholder="Enter location" value="${this.userDetails.location || ''}" style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; width: 200px;">
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Height:</span>
                        <input type="text" id="profile-height" placeholder="Enter height" value="${this.userDetails.height || ''}" style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; width: 200px;">
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Size:</span>
                        <input type="text" id="profile-size" placeholder="Enter size" value="${this.userDetails.size || ''}" style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; width: 200px;">
                    </div>
                    <div class="detail-row" style="margin-top: 1rem;">
                        <button class="btn btn-primary" id="save-profile-btn" style="width: auto; padding: 0.75rem 2rem;" disabled>Save Changes</button>
                    </div>
                    ${this.userDetails.verificationImagePath || this.userDetails.status === 'PICTURE_REQUESTED' ? `
                    <div class="detail-row" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
                        <div style="width: 100%;">
                            <span class="detail-label" style="display: block; margin-bottom: 1rem;">Verification Image:</span>
                            <div style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap;">
                                ${this.userDetails.verificationImagePath ? `
                                <div style="flex: 0 0 auto;">
                                    <div style="display: flex; justify-content: center; align-items: center;">
                                        <img src="/api/files?path=${encodeURIComponent(this.userDetails.verificationImagePath)}&t=${new Date().getTime()}" 
                                             alt="Verification Image" 
                                             class="verification-thumbnail"
                                             data-full-image="/api/files?path=${encodeURIComponent(this.userDetails.verificationImagePath)}&t=${new Date().getTime()}"
                                             style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" />
                                    </div>
                                    <p style="text-align: center; margin-top: 0.5rem; color: #666; font-size: 0.85rem;">Click to view full size</p>
                                </div>
                                ` : ''}
                                ${this.userDetails.status === 'PICTURE_REQUESTED' ? `
                                <div style="flex: 1 1 300px; min-width: 250px;">
                                    <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; border-left: 4px solid #2196f3;">
                                        <p style="margin: 0 0 1rem 0; color: #1976d2; font-weight: 600;">
                                            📷 New Picture Required
                                        </p>
                                        <p style="margin: 0 0 1rem 0; color: #333;">
                                            Your verification picture needs to be updated. Please upload a new picture for review.
                                        </p>
                                        <button class="btn btn-primary" id="upload-picture-btn" style="width: auto; min-width: 200px;">
                                            Upload New Picture
                                        </button>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Store original values for change detection
        this.originalProfileValues = {
            age: this.userDetails.age,
            location: this.userDetails.location,
            height: this.userDetails.height,
            size: this.userDetails.size
        };
        
        // Re-attach event listeners for elements that were just created/updated
        this.attachProfileContentListeners();
        
        // Attach click handler for verification thumbnail
        const thumbnail = container.querySelector('.verification-thumbnail');
        if (thumbnail) {
            thumbnail.addEventListener('click', (e) => {
                const fullImageUrl = (e.target as HTMLElement).getAttribute('data-full-image');
                if (fullImageUrl) {
                    this.openImageViewer(fullImageUrl);
                }
            });
        }
        
        // Initial check for changes (should be disabled initially)
        this.updateSaveButtonState();
    }
    
    private updateSaveButtonState() {
        const saveBtn = document.getElementById('save-profile-btn') as HTMLButtonElement;
        if (!saveBtn || !this.originalProfileValues) {
            return;
        }
        
        const ageInput = document.getElementById('profile-age') as HTMLInputElement;
        const locationInput = document.getElementById('profile-location') as HTMLInputElement;
        const heightInput = document.getElementById('profile-height') as HTMLInputElement;
        const sizeInput = document.getElementById('profile-size') as HTMLInputElement;
        
        if (!ageInput || !locationInput || !heightInput || !sizeInput) {
            return;
        }
        
        // Get current values
        const currentAge = ageInput.value ? parseInt(ageInput.value) : null;
        const currentLocation = locationInput.value || null;
        const currentHeight = heightInput.value || null;
        const currentSize = sizeInput.value || null;
        
        // Check if any value has changed
        const hasChanges = 
            currentAge !== this.originalProfileValues.age ||
            currentLocation !== this.originalProfileValues.location ||
            currentHeight !== this.originalProfileValues.height ||
            currentSize !== this.originalProfileValues.size;
        
        // Enable/disable button based on changes
        saveBtn.disabled = !hasChanges;
        if (hasChanges) {
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        } else {
            saveBtn.style.opacity = '0.6';
            saveBtn.style.cursor = 'not-allowed';
        }
    }
    
    private openImageViewer(imageUrl: string) {
        const modal = document.getElementById('image-viewer-modal');
        const fullImage = document.getElementById('image-viewer-full-image');
        if (modal && fullImage) {
            fullImage.setAttribute('src', imageUrl);
            modal.classList.add('active');
        }
    }

    private attachProfileEventListeners() {
        const backBtn = document.getElementById('back-btn');
        backBtn?.addEventListener('click', () => {
            this.currentPage = 'home';
            this.render();
        });
    }

    private attachProfileContentListeners() {
        // Add change listeners to all input fields
        const ageInput = document.getElementById('profile-age');
        const locationInput = document.getElementById('profile-location');
        const heightInput = document.getElementById('profile-height');
        const sizeInput = document.getElementById('profile-size');
        
        [ageInput, locationInput, heightInput, sizeInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.updateSaveButtonState();
                });
                input.addEventListener('change', () => {
                    this.updateSaveButtonState();
                });
            }
        });
        
        // Save profile button
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            // Remove any existing listeners by cloning the node
            const newSaveBtn = saveProfileBtn.cloneNode(true);
            saveProfileBtn.parentNode?.replaceChild(newSaveBtn, saveProfileBtn);
            
            // Attach fresh listener to the new button
            (newSaveBtn as HTMLElement).addEventListener('click', () => {
                this.saveProfileChanges();
            });
        }
        
        // Upload picture button (this is called after renderUserDetails updates the content)
        const uploadPictureBtn = document.getElementById('upload-picture-btn');
        if (uploadPictureBtn) {
            // Remove any existing listeners by cloning the node
            const newBtn = uploadPictureBtn.cloneNode(true);
            uploadPictureBtn.parentNode?.replaceChild(newBtn, uploadPictureBtn);
            
            // Attach fresh listener to the new button
            (newBtn as HTMLElement).addEventListener('click', () => {
                const uploadModal = document.getElementById('upload-picture-modal');
                if (uploadModal) {
                    // Clear any previous messages and reset form
                    const messageDiv = document.getElementById('upload-picture-message');
                    if (messageDiv) {
                        messageDiv.innerHTML = '';
                        messageDiv.className = '';
                    }
                    const form = document.getElementById('upload-picture-form') as HTMLFormElement;
                    if (form) {
                        form.reset();
                    }
                    uploadModal.classList.add('active');
                }
            });
        }
    }
    
    private async saveProfileChanges() {
        const ageInput = document.getElementById('profile-age') as HTMLInputElement;
        const locationInput = document.getElementById('profile-location') as HTMLInputElement;
        const heightInput = document.getElementById('profile-height') as HTMLInputElement;
        const sizeInput = document.getElementById('profile-size') as HTMLInputElement;
        
        if (!ageInput || !locationInput || !heightInput || !sizeInput) {
            return;
        }
        
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
        
        try {
            this.userDetails = await userApi.updateProfile(updates);
            
            // Update original values to match the saved values
            this.originalProfileValues = {
                age: this.userDetails.age,
                location: this.userDetails.location,
                height: this.userDetails.height,
                size: this.userDetails.size
            };
            
            this.showMessage(document.getElementById('user-details-content'), 'Profile updated successfully!', 'success');
            // Reload the profile view to show updated values
            const contentDiv = document.getElementById('user-details-content');
            if (contentDiv) {
                this.renderUserDetails(contentDiv);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message || 
                                error.message || 
                                'Unknown error';
            this.showMessage(document.getElementById('user-details-content'), `Failed to update profile: ${errorMessage}`, 'error');
        }
    }

    private async handleUploadPicture() {
        const messageDiv = document.getElementById('upload-picture-message');
        const form = document.getElementById('upload-picture-form') as HTMLFormElement;
        
        if (!messageDiv || !form) return;

        const imageFile = (document.getElementById('upload-image') as HTMLInputElement).files?.[0];

        if (!imageFile) {
            this.showMessage(messageDiv, 'Please select a verification image', 'error');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Uploading...';
        }

        try {
            const formData = new FormData();
            formData.append('verificationImage', imageFile);

            const response = await userApi.uploadPicture(formData);

            // Close upload modal immediately
            const uploadModal = document.getElementById('upload-picture-modal');
            uploadModal?.classList.remove('active');
            form.reset();

            // Clean up URL if it has any query parameters
            if (window.location.search) {
                window.history.replaceState({}, '', window.location.pathname);
            }

            // Reload user details to update status
            await this.loadUserDetails();

            // Update auth section to reflect new status (remove upload button if status changed)
            this.updateAuthSection();

            // Show success confirmation modal
            const existingModal = document.getElementById('upload-picture-success-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const successModal = document.createElement('div');
            successModal.className = 'modal active';
            successModal.id = 'upload-picture-success-modal';

            const closeSuccessModal = () => {
                successModal.classList.remove('active');
                setTimeout(() => {
                    successModal.remove();
                }, 300);
            };

            successModal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #4caf50;">✓</div>
                    <h2 style="color: #4caf50; margin-bottom: 1rem;">Picture Uploaded!</h2>
                    <p style="margin-bottom: 1.5rem;">${response.message || 'Picture uploaded successfully! Your account is back in review.'}</p>
                    <button class="btn btn-primary" id="upload-picture-success-ok-btn">OK</button>
                </div>
            `;
            document.body.appendChild(successModal);

            // Add click handler to OK button
            const okBtn = successModal.querySelector('#upload-picture-success-ok-btn');
            okBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeSuccessModal();

                // Refresh the page view if on profile page
                if (this.currentPage === 'profile') {
                    this.render();
                }
                
                return false;
            }, { once: true });

            // Prevent modal from closing when clicking inside the modal content
            const modalContent = successModal.querySelector('.modal-content');
            modalContent?.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Close modal when clicking outside (on backdrop)
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    closeSuccessModal();
                    // Refresh the page view if on profile page
                    if (this.currentPage === 'profile') {
                        this.render();
                    }
                }
            });

        } catch (error: any) {
            console.error('Upload picture error:', error);
            let errorMsg = 'Failed to upload picture. Please try again.';
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.message) {
                errorMsg = error.message;
            }
            this.showMessage(messageDiv, errorMsg, 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload Picture';
            }
        }
    }
}


