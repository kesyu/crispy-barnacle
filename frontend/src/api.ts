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
        const response = await api.post('/registration/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
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
};


