// Supabase-ийн тохиргоог ажиллах үед (runtime) уншина.
// Хуучин NEXT_PUBLIC_ нэрийг ч дэмжинэ. Bracket хэлбэрээр уншвал build үед кодонд шигтгэгдэхгүй.
const read = (...keys: string[]) => {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Тохиргоо дутуу: ${keys[0]}`);
};

export const supabaseUrl = () => read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
export const supabaseAnonKey = () => read("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const supabaseServiceKey = () => read("SUPABASE_SERVICE_ROLE_KEY");
