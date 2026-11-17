export type Role = "admin" | "manager" | "employee";

export type Employee = {
  id: string;
  organization_id: string;
  user_id: string | null;
  emp_code: string;
  full_name: string;
  phone: string;
  role: Role;
  department_id: string | null;
  branch_id: string | null;
  schedule_id: string | null;
  cycle_anchor_date: string | null;
  allow_trip: boolean;
  is_active: boolean;
};

export type Branch = {
  id: string;
  organization_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  allowed_ips: string[];
  is_active: boolean;
};

export type Schedule = {
  id: string;
  organization_id: string;
  name: string;
  kind: "fixed" | "cycle";
  start_time: string; // "09:00:00"
  end_time: string;
  break_minutes: number;
  work_weekdays: number[];
  cycle_length_days: number | null;
  work_days_in_cycle: number | null;
  shift_hours: number | null;
  late_grace_minutes: number;
};

export type AttendanceLog = {
  id: string;
  employee_id: string;
  branch_id: string | null;
  work_date: string;
  check_in_at: string;
  check_out_at: string | null;
  in_distance: number | null;
  out_distance: number | null;
  verify_method: "GPS" | "WIFI" | "TRIP";
  in_selfie_path: string | null;
  out_selfie_path: string | null;
  worked_minutes: number | null;
  late_minutes: number;
  overtime_minutes: number;
  status: "working" | "completed";
  review_status: "auto" | "pending" | "approved" | "rejected";
  note: string | null;
  in_lat: number | null;
  in_lng: number | null;
};

export type RequestType =
  | "paid_leave"
  | "unpaid_leave"
  | "sick_leave"
  | "overtime"
  | "outside_work"
  | "forgot_checkin";

export const REQUEST_LABELS: Record<RequestType, string> = {
  paid_leave: "Цалинтай чөлөө",
  unpaid_leave: "Цалингүй чөлөө",
  sick_leave: "Өвчтэй",
  overtime: "Илүү цаг",
  outside_work: "Гадуур ажил",
  forgot_checkin: "Бүртгүүлэхээ мартсан",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  approved: "Батлагдсан",
  rejected: "Татгалзсан",
  auto: "Автомат",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Админ",
  manager: "Менежер",
  employee: "Ажилтан",
};
