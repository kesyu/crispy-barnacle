import axios from 'axios';

// Use relative path to leverage Vite proxy
const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // If the data is FormData, remove Content-Type header so axios can set it with the correct boundary
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Utility function to check if JWT token is expired
export function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return true; // Invalid token format
        }
        
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if expiration exists and if it's in the past
        if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= expirationTime;
        }
        
        return true; // No expiration claim, consider expired
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true; // Error decoding, consider expired
    }
}

// Function to clear session and update UI
function handleSessionExpired() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    
    // If we're on the admin page, show login and hide admin sections
    if (window.location.pathname.includes('admin.html')) {
        const loginSection = document.getElementById('login-section');
        const adminMenubar = document.getElementById('admin-menubar');
        const reviewSection = document.getElementById('review-section');
        const usersListSection = document.getElementById('users-list-section');
        const eventsSection = document.getElementById('events-section');
        const adminHeader = document.getElementById('admin-dashboard-header');
        
        if (loginSection) loginSection.style.display = 'block';
        if (adminMenubar) adminMenubar.style.display = 'none';
        if (reviewSection) reviewSection.style.display = 'none';
        if (usersListSection) usersListSection.style.display = 'none';
        if (eventsSection) eventsSection.style.display = 'none';
        if (adminHeader) adminHeader.style.display = 'none';
        
        // Show message if message div exists
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = 'Your session has expired. Please log in again.';
            messageDiv.className = 'error';
            messageDiv.style.display = 'block';
        }
    } else {
        // For the main app, dispatch a custom event that App.ts can listen to
        window.dispatchEvent(new CustomEvent('session-expired'));
    }
}

// Check token expiration before making requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Check if token is expired before sending request
        if (isTokenExpired(token)) {
            handleSessionExpired();
            // Cancel the request
            return Promise.reject(new Error('Token expired'));
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    // If the data is FormData, remove Content-Type header so axios can set it with the correct boundary
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Handle 401 Unauthorized and 403 Forbidden responses (expired/invalid tokens)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token is expired, invalid, or user doesn't have permission - log out the user
            handleSessionExpired();
        }
        return Promise.reject(error);
    }
);

export interface EventDTO {
    id: number;
    city: string;
    dateTime: string;
    spaces: SpaceDTO[];
    availableSpacesCount: number;
    totalSpacesCount: number;
    cancelled: boolean;
}

export interface SpaceDTO {
    id: number;
    name: string;
    color: string;
    available: boolean;
    bookedBy: string | null;
}

export interface RegistrationRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface UserDetailsDTO {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    approved: boolean;
    createdAt: string;
    verificationImagePath: string | null;
    bookedSpacesCount: number;
    age: number | null;
    location: string | null;
    height: string | null;
    size: string | null;
    adminComments: string | null;
}

export interface SpaceTemplateDTO {
    id: number;
    name: string;
    color: string;
}

export const eventApi = {
    getUpcomingEvent: async (): Promise<EventDTO> => {
        const response = await api.get<EventDTO>('/events/upcoming');
        return response.data;
    },
    getAllEvents: async (): Promise<EventDTO[]> => {
        const response = await api.get<EventDTO[]>('/events/all');
        return response.data;
    },
    createEvent: async (city: string, dateTime: string, spaceTemplateIds: number[]): Promise<EventDTO> => {
        const response = await api.post<EventDTO>('/events', {
            city,
            dateTime,
            spaceTemplateIds
        });
        return response.data;
    },
    cancelEvent: async (eventId: number): Promise<EventDTO> => {
        const response = await api.put<EventDTO>(`/events/${eventId}/cancel`);
        return response.data;
    },
};

export const registrationApi = {
    register: async (formData: FormData): Promise<{ message: string; requestId: string }> => {
        try {
            // The interceptor will automatically remove Content-Type for FormData
            const response = await api.post('/registration/register', formData);
            return response.data;
        } catch (error: any) {
            // Ensure error is properly thrown with response data
            if (error.response && error.response.status >= 400) {
                throw error; // Re-throw axios error which includes response.data
            }
            throw error;
        }
    },
};

export const authApi = {
    login: async (credentials: LoginRequest): Promise<{ token: string; email: string; firstName: string; lastName: string; approved: boolean }> => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
};

export const spaceApi = {
    bookSpace: async (eventId: number, spaceId: number): Promise<{ message: string; spaceId: string; spaceName: string }> => {
        const response = await api.post(`/spaces/events/${eventId}/book`, { spaceId });
        return response.data;
    },
    cancelBooking: async (spaceId: number): Promise<{ message: string }> => {
        const response = await api.delete(`/spaces/${spaceId}/cancel`);
        return response.data;
    },
};

export const userApi = {
    getCurrentUser: async (): Promise<UserDetailsDTO> => {
        const response = await api.get<UserDetailsDTO>('/users/me');
        return response.data;
    },
    uploadPicture: async (formData: FormData): Promise<{ message: string; status: string; verificationImagePath: string }> => {
        try {
            // The interceptor will automatically remove Content-Type for FormData
            const response = await api.post('/users/me/upload-picture', formData);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status >= 400) {
                throw error;
            }
            throw error;
        }
    },
    updateProfile: async (updates: { age?: number | null; location?: string | null; height?: string | null; size?: string | null }): Promise<UserDetailsDTO> => {
        const response = await api.put<UserDetailsDTO>('/users/me', updates);
        return response.data;
    },
};

export const spaceTemplateApi = {
    getAllTemplates: async (): Promise<SpaceTemplateDTO[]> => {
        const response = await api.get<SpaceTemplateDTO[]>('/space-templates');
        return response.data;
    },
};

export const adminApi = {
    updateUser: async (userId: number, updates: { age?: number | null; location?: string | null; height?: string | null; size?: string | null; adminComments?: string | null }): Promise<UserDetailsDTO> => {
        const response = await api.put<UserDetailsDTO>(`/admin/users/${userId}`, updates);
        return response.data;
    },
};


