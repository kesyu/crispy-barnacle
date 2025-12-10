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

export interface EventDTO {
    id: number;
    city: string;
    dateTime: string;
    spaces: SpaceDTO[];
    availableSpacesCount: number;
    totalSpacesCount: number;
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
}

export const eventApi = {
    getUpcomingEvent: async (): Promise<EventDTO> => {
        const response = await api.get<EventDTO>('/events/upcoming');
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
};


