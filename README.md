# Цаг бүртгэлийн систем (1-р үе шат)

Ажилтны ирцийг утсаар (PWA) бүртгэж, удирдлага вебээс тохируулж тайлан гаргана. Цаашид ERP болж өргөжнө.

- **Ажилтан** (`/app`): Ирлээ/Явлаа (GPS радиус эсвэл салбарын Wi-Fi IP), томилолтын үед сельфи + байршил, ирцийн түүх, чөлөө/илүү цагийн хүсэлт, нууц үг солих.
- **Удирдлага** (`/admin`): өнөөдрийн ирц, ирцийн бүртгэл ба томилолт батлах, хүсэлт батлах, тайлан + Excel, ажилтан, салбар, хуваарь (тогтмол ба 24/48 ээлж), баярын өдрүүд.
- Цаг, байршлын шалгалт, хоцролт, илүү цагийг **сервер** тооцно. Утасны цагийг өөрчилж залилах боломжгүй.

Технологи: Next.js 16 + Tailwind, Supabase (PostgreSQL, Auth, Storage), Cloudflare Workers (OpenNext).

## Суулгах

1. Supabase төсөл дээр **SQL Editor** нээж `supabase/migrations/0001_attendance.sql`-ийг бүхэлд нь ажиллуулна.
2. `.env.example`-ийг `.env.local` нэрээр хуулж, Supabase **Project Settings → API**-аас утгуудыг бөглөнө. `SUPABASE_SERVICE_ROLE_KEY` нууц тул хэнд ч бүү өг.
3. ```bash
   npm install
   npm run setup     # байгууллага, анхны админ, үндсэн хуваарь үүсгэнэ
   npm run dev       # http://localhost:3000
   ```
4. Админаар нэвтэрч: Салбар → Хуваарь → Ажилтан гэсэн дарааллаар тохируулна.

## Утсандаа суулгах
- **iPhone:** Safari → Share → Add to Home Screen
- **Android:** Chrome → ⋮ → Install app

Байршил ажиллахын тулд сайт **HTTPS** дээр байх шаардлагатай (байршуулсны дараа автоматаар).

## Шалгах
```bash
npm test          # хуваарь, хоцролт, илүү цаг, цагийн бүсийн тест
npx tsc --noEmit && npx eslint src
```

## Анхаарах
- Нэвтрэх нэр нь утасны дугаар. SMS зардлаас зайлсхийх үүднээс дотооддоо `<утас>@staff.example.com` хэлбэрийн имэйлээр Supabase Auth-д хадгална.
- Веб апп GPS хуурамч байршлын аппыг бүрэн илрүүлж чадахгүй. Нарийвчлал муу (150м+) байршлыг хүлээн авахгүй, зайг хадгалж, газрын зургийн холбоосоор шалгах боломжтой.
- Supabase үнэгүй багц 7 хоног ашиглаагүй бол түр зогсдог.

## Cloudflare дээр байршуулах
Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → энэ repo.
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- **Settings → Variables and Secrets** (Build болон Runtime хоёуланд): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Secret).

Локалаар Workers орчинд турших: `.dev.vars` файлд дээрх 3 утгыг бичээд `npm run preview`.
