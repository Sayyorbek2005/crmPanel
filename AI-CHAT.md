# AI Chat — mahalliy sinov

Node.js 22.9 yoki yangiroq kerak. Sayt va AI server ikki alohida jarayonda ishlaydi.

1. `npm start` — sayt (odatda http://localhost:3000).
2. `npm run start:ai` — AI server (127.0.0.1:8787).
3. Saytda AI Chat bo‘limini oching. Mahalliy rejim API kalitisiz ishlaydi; bu generativ AI emas.
4. OpenAI bilan sinash uchun `.env.example` nusxasini `.env.local` nomida yarating, `OPENAI_API_KEY` qiymatini o‘z kalitingiz bilan almashtiring. Kalitni chatga yubormang. `.env.local` Git tomonidan e’tiborsiz qoldiriladi. Serverni qayta ishga tushiring, chatdagi “Ulanishni tekshirish”, so‘ng “OpenAI” tugmasini bosing.

API kaliti faqat serverda ishlatiladi. Model `OPENAI_MODEL` orqali belgilanadi. Ulanish belgisi kalit mavjudligini bildiradi; kalit, modelga ruxsat va balans haqiqiy so‘rovda tekshiriladi. Savol va jamlangan CRM ko‘rsatkichlari OpenAI Responses API xizmatiga yuboriladi (`store: false`). Ism, telefon, login va parollar snapshotga kiritilmaydi.

Tahlil brauzerda saqlangan moliya, POS sotuvlari, qarz to‘lovlari, ombor qoldig‘i va qaytarishlarga asoslanadi. Ayrim boshlang‘ich yozuvlar namunaviy. Davr — barcha mavjud yozuvlar. Moliya va POS tushumlari alohida; ularni qo‘shish takror hisoblashga olib keladi. Kirim minus chiqim sof foyda emas. To‘liq tannarx, ombor harakatlari tarixi va barcha bo‘limlarning umumiy bazasi hali yo‘q.

Suhbat joriy brauzer sessiyasida, foydalanuvchi bo‘yicha alohida saqlanadi. So‘nggi 60 xabar saqlanadi; so‘rovda oxirgi 10 xabar yuboriladi.

Bu mahalliy sinov integratsiyasi. Server faqat loopback manzilida ishlaydi; uni ochiq internetga chiqarmang. Pullik obuna hali ulanmagan: avval serverdagi autentifikatsiya, tashkilotlar bo‘yicha ma’lumot ajratish, serverdan tekshiriladigan obuna/kvota va to‘lov provayderining tasdiqlangan webhooklari kerak. Brauzerdagi “to‘langan” belgisi to‘lov isboti bo‘la olmaydi.

Tekshirish: `node --test server/ai-server.test.js` va `npm run build`.
API hujjati: https://developers.openai.com/api/docs/guides/migrate-to-responses
