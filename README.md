# My First Full-Stack App — הרשמה פשוטה

אתר קטן עם **Frontend (HTML/CSS/JavaScript)**, **Backend (Node.js + Express)** ו-**Database (PostgreSQL)**.

## תרשים זרימה

```text
Browser (public/app.js)
   |  POST /api/users  {"name":"Dana"}
   v
Backend (server.js)
   |  INSERT INTO users ...
   v
PostgreSQL database
   |  saved record
   v
Backend returns JSON
   |  GET /api/users
   v
Browser displays the updated list
```

## 1. הכנה

- התקינו Node.js גרסה 20 ומעלה ו-Git.
- צרו מסד PostgreSQL אצל ספק כמו [Neon](https://neon.tech) ושמרו את **connection string** (זהו מידע סודי).
- פתחו את התיקייה ב-VS Code, או בכל עורך קוד.

## 2. הרצה במחשב

```bash
npm install
cp .env.example .env
```

פתחו את `.env` ושנו את `DATABASE_URL` לכתובת החיבור האמיתית של בסיס הנתונים. לאחר מכן:

```bash
npm run dev
```

גלשו לכתובת http://localhost:3000 . השרת ייצור אוטומטית טבלה בשם `users` אם היא עדיין לא קיימת.

## 3. ניסוי מומלץ (בדפדפן)

1. לחצו F12 או פתחו Developer Tools → Network.
2. מלאו שם ולחצו 'הרשמה'.
3. חפשו בקשת `POST /api/users` שנשלחה עם JSON ותשובת `201`.
4. חפשו `GET /api/users` עם רשימת השמות שחזרה מהשרת.
5. רעננו את הדף — השם נשמר במסד הנתונים.

## 4. העלאה ל-GitHub

צרו Repository **ריק** ב-GitHub בשם `signup-demo` (בלי README נוסף), ובטרמינל בתוך התיקייה הריצו:

```bash
git init
git add .
git commit -m "Build first full-stack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signup-demo.git
git push -u origin main
```

החליפו `YOUR_USERNAME` בשם החשבון שלכם. GitHub מיועד לקוד; הוא **לא** מפעיל בעצמו את שרת ה-Node.js דרך GitHub Pages.

## 5. פרסום כאתר חי ב-Render

1. פתחו [Render](https://render.com/) ובחרו **New → Web Service**.
2. חברו GitHub ובחרו את ה-Repository `signup-demo`.
3. Runtime: **Node**; Build command: `npm install`; Start command: `npm start`.
4. הוסיפו Environment Variable בשם `DATABASE_URL` עם ה-connection string האמיתי של PostgreSQL. **אל תדביקו אותו לקובצי GitHub**.
5. בחרו בתכנית המתאימה (אפשר Free לדמו, בכפוף למגבלותיה) וצרו את השירות.
6. בתום הפריסה תתקבל כתובת אתר ציבורית שמסתיימת ב-`onrender.com`.

אפשר לחבר את **אותו** מסד נתונים גם לאתר המקומי וגם לאתר הציבורי. המשמעות: שמות שנשמרו באתר אחד יהיו גלויים גם בשני. אל תפרסמו סיסמאות או פרטי connection string.

## API

- `POST /api/appointments` עם גוף `{"name":"Dana","contact":"050-1234567","interest":"engagement","message":"..."}` → שומר פנייה בטבלה `appointments` ומחזיר `201`.
  - `interest` חייב להיות אחד מ: `engagement`, `earrings`, `bracelet`, `loose`, `custom`, `other`.
  - `contact` חייב להיות טלפון או אימייל תקין. `message` אינו חובה (עד 500 תווים).
  - מוגבל ל־5 פניות לכל כתובת IP בכל 10 דקות (`429`).
- אין נקודת API שמציגה את הפניות. הן פרטיות.

## איך רואים את הפניות

פותחים את ה־SQL Editor אצל ספק מסד הנתונים (למשל Neon) ומריצים:

```sql
SELECT created_at, name, contact, interest, message
FROM appointments
ORDER BY created_at DESC;
```

## חשוב

זהו **דמו לימודי**, לא מערכת הרשמה אמיתית עם חשבונות משתמש. אין סיסמאות, אימות משתמשים, הרשאות או הגבלת כמות בקשות. כל מי שמגיע לאתר יכול להוסיף שם ולראות את השמות. **אל תזינו מידע אישי רגיש**. לשימוש אמיתי צריך להוסיף אבטחה, אישורים, מנגנוני נגד-ספאם ושיקולי פרטיות. מסלול Free של Render עשוי להירדם אחרי חוסר פעילות; מסד הנתונים של ספק חיצוני חייב להיות פעיל.
