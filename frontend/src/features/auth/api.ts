import { apiRequest } from "@/lib/api-client";

import type { LoginInput, LoginResponse, User } from "./types";

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<LoginResponse>("/auth/login", { method: "POST", body: input }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  me: (signal?: AbortSignal) => apiRequest<User>("/auth/me", { signal }),
};
