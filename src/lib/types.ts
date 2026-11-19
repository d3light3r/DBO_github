export type Role = "admin" | "manager" | "employee";

export type Employee = {
  id: string;
  organization_id: string;
  user_id: string | null;
  emp_code: string;
  full_name: string;
  phone: string;
  role: Role;
  company_id: string | null;
  department_id: string | null; // алба хэлтэс
  unit_id: string | null; // салбар (ШТС байж болно)
  branch_id: string | null; // координат (ирц бүртгэх цэг)
  schedule_id: string | null;
  require_device: boolean; // зөвхөн бүртгэлтэй утаснаас цаг бүртгүүлэх
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

export type Company = { id: string; organization_id: string; name: string };
export type Department = { id: string; organization_id: string; company_id: string | null; name: string; approver_id: string | null };
/** Салбар (байгууллагын нэгж). is_station = ШТС */
export type Unit = { id: string; organization_id: string; department_id: string; name: string; is_station: boolean; is_active: boolean };

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

export type Device = {
  id: string;
  organization_id: string;
  employee_id: string;
  token_hash: string;
  label: string | null;
  status: "pending" | "approved";
  approved_at: string | null;
  last_used_at: string | null;
  created_at: string;
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

// ---------------- ШТС ----------------
export type FuelType = { id: string; organization_id: string; name: string; price: number; is_active: boolean };

export type Tank = {
  id: string;
  organization_id: string;
  branch_id: string;
  fuel_type_id: string;
  name: string;
  capacity_liters: number | null;
  is_active: boolean;
};

export type Nozzle = { id: string; organization_id: string; branch_id: string; tank_id: string; name: string; is_active: boolean };

export type StationShift = {
  id: string;
  organization_id: string;
  branch_id: string;
  status: "open" | "closed";
  opened_by: string;
  opened_at: string;
  handover_expected: number;
  handover_received: number;
  closed_by: string | null;
  closed_at: string | null;
  sales_liters: number | null;
  sales_amount: number | null;
  pay_cash: number | null;
  pay_card: number | null;
  pay_coupon: number | null;
  pay_credit: number | null;
  difference: number | null;
  handover_cash: number | null;
  note: string | null;
};

export type ShiftReading = {
  id: string;
  shift_id: string;
  nozzle_id: string;
  start_reading: number;
  end_reading: number | null;
  price: number | null;
  liters: number | null;
  amount: number | null;
};

export type FuelReceipt = {
  id: string;
  branch_id: string;
  tank_id: string;
  shift_id: string | null;
  liters: number;
  doc_no: string | null;
  supplier: string | null;
  received_by: string;
  received_at: string;
};
