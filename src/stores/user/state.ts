import { UserState } from "./types";

export const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
  isProfileComplete: false,
};
