type StaffStatus = "Available" | "Assigned" | "Busy" | "Offline";

export type Staff = {
    id: string;
    phone: string;
    avatar: string | null; // should be an image url or null (if null then put a generic placeholder)
    skills: string[]; // list of service types (BY ID ONLY e.g. ["basic", "mattress", "office"]) that this cleaner can do
    experienceYears: number;
    availability: string[]; // by days of the week
    rating: number; // like a 0-5.0 average star rating
    completedJobs: number;
    status: StaffStatus;
    isActive: boolean;
    userId: string; // the User id for this staff member (links the staff to their user account); must be unique (each staff has exactly one user account)
};