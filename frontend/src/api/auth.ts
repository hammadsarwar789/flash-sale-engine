import { apiFetch, setAuthToken } from './client';
import { AuthResponse, User } from '../types/api';

export const authApi = {
  async register(data: { email: string; password: string; full_name?: string }): Promise<User> {
    return apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/auth/me');
  },

  async logout(): Promise<{ message: string }> {
    try {
      const res = await apiFetch<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      return res;
    } finally {
      setAuthToken(null);
    }
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    return apiFetch<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(reset_token: string, new_password: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reset_token, new_password }),
    });
  },

  async verifyEmail(user_id: string): Promise<{ message: string; user?: User }> {
    return apiFetch<{ message: string; user?: User }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  async submitRegistrationRequest(data: {
    applicant_email: string;
    applicant_name: string;
    request_type: 'STAFF_ONBOARDING' | 'MANAGER_ONBOARDING' | 'VENDOR_REGISTRATION';
    target_outlet_id?: string;
    password?: string;
    payload?: any;
  }): Promise<any> {
    return apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.applicant_email,
        full_name: data.applicant_name,
        password: data.password,
        request_type: data.request_type,
        target_outlet_id: data.target_outlet_id,
        company_name: data.payload?.company_name,
      }),
    });
  },
};
