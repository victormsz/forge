export interface RegisterFormState {
    status: "idle" | "success" | "error";
    message?: string;
    verificationUrl?: string;
}

export const REGISTER_FORM_INITIAL_STATE: RegisterFormState = { status: "idle" };
