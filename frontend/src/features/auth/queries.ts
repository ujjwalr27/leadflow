"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "./api";
import { goToLogin } from "./redirect";
import type { LoginInput } from "./types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => authApi.me(signal),
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: ({ user }) => queryClient.setQueryData(authKeys.me, user),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => authApi.logout(),
    // A full page load to /login discards every cached lead from this session.
    onSuccess: () => goToLogin(),
  });
}
