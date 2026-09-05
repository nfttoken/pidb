export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};
