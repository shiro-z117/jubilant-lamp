type StaffStatus = "Available" | "Assigned" | "Busy" | "Offline";

export type Staff = {
    id: string;
    name: string; // full name as a single field
    phone: string;
    email: string;
    avatar: string | null; // should be an image url
    skills: string[]; // list of cleaning types this cleaner can do
    experienceYears: number;
    availability: string[]; // by days of the week
    rating: number; // like a 0-5.0 average star rating
    completedJobs: number;
    status: StaffStatus;
    isActive: boolean;
};