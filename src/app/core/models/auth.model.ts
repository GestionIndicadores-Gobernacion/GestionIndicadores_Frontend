import { UserModel } from "../../features/user/models/user.model";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserModel;
}
