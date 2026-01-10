// Type augmentation for NextAuth
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// User role types
export type UserRole = "student" | "teacher" | "admin";

// Helper function to determine user role from email
export function getUserRole(email: string | null | undefined): UserRole | null {
  if (!email) return null;

  if (email === "kevilshaji@gmail.com") {
    return "admin";
  } else if (email.includes("student.sfit.ac.in")) {
    return "student";
  } else if (email.endsWith("@sfit.ac.in")) {
    return "teacher";
  }

  return null;
}

// Helper function to get dashboard path for role
export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    student: "/student",
    teacher: "/teacher",
    admin: "/admin",
  };

  return paths[role];
}

export interface Subject {
  code: string;
  fullName: string;
  type: 'Lec' | 'Lab'; // Changed to match DB
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface SubQuestion {
  label: string;
  co: string;
  marks: number;
}

export interface Task {
  id: string;
  allotmentId?: number; // Links to allotment table
  title: string;
  startTime?: string;
  endTime?: string;
  type: 'Lec' | 'Lab'; // Changed to match DB: 'Lec' or 'Lab'
  experimentNumber?: number;
  assessmentType?: 'ISE' | 'MSE';
  assessmentSubType?: 'Subjective' | 'MCQ';
  mcqQuestions?: Question[];
  subQuestions?: SubQuestion[];
  maxMarks: number;
  mappedCOs: string[]; // Will be stored in task_co_mapping table
  subjectCode: string; // Maps to sub_id in DB
  classStr: string; // Maps to class_name in DB
  batch: string;
  createdAt?: string;
}

export interface FilterState {
  course: string;
  semester: string;
  classStr: string;
  subjectCode: string;
  batch: string;
  isSubjectIncharge?: boolean;
}
