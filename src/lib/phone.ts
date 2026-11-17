/** Утасны дугаарыг нэвтрэх имэйл болгон хувиргана (SMS-ийн зардлаас зайлсхийх). */
export const LOGIN_EMAIL_DOMAIN = "staff.example.com";

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@${LOGIN_EMAIL_DOMAIN}`;
}
