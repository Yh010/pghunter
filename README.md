## PG Hunter – Compare Paying Guests Like a Spreadsheet (But Faster)

PG Hunter is a **mobile‑first React + Supabase web app** built for a very specific real‑world pain:

> When you are hunting for a PG, you visit 5–20 places, take random photos and notes, and then later you can’t remember which one had better food, which one was closer to CV Nagar Oracle vs Oracle TechHub, or why the “cheapest” one was actually a bad deal.

This project exists to **capture all the important factors of each PG in one place** and give you an **instant comparison view**, so you can choose logically instead of going by vague memory.

---

### Why this project exists

- **Too many PGs, too much info**: Rent, deposit, rules, food, distance, amenities, curfew, guests policy… it is easy to forget details after visiting a few places.
- **Photos/WhatsApp notes are not structured**: You end up with a mess of images and random notes that can’t be sorted or compared.
- **Decision fatigue**: You want to know quickly things like:
  - Which PG has **maximum non‑veg meals per week**?
  - Which one is **cheapest overall** (considering deposit + rent)?
  - Which ones are **closest to CV Nagar Oracle** vs **Oracle TechHub**?
- **Solution**: Turn your PG search into a **small personal database + spreadsheet**, but with a UI that works well on your phone when you’re actually standing at the property.

PG Hunter was built exactly around those questions.

---

### What you can track for each PG

For every PG you visit, you can store:

- **Cost**
  - **Monthly rent (₹)**
  - **Security deposit (₹)**
- **Amenities**
  - Free text: WiFi, washing machine, attached bathroom, AC, housekeeping, etc.
- **Food**
  - **Non‑veg meals per week** (how many times non‑veg is served)
  - **Weekly food menu** (Mon–Sun details)
  - **Times you expect to miss meals per week** (because of office timings, etc.)
- **Location**
  - **Nearest office**: `CV Nagar – Oracle` or `Oracle TechHub`
  - **Distance to office (km)** (optional)
  - **Full address / description**
- **Type**
  - Boys PG / CoLive / Other
- **Other terms & conditions**
  - Lock‑in period, notice period, guest policy, curfew, electricity charges, etc.

All of this is then shown in a **sortable comparison table**.

---

### Key features

- **Mobile‑first UI**
  - Optimised to quickly fill details while standing at the property.
  - Clean layout, small inputs, works nicely on a phone screen.
- **Structured PG form**
  - Single form to capture everything you care about for each PG.
  - Edit and delete any PG later.
- **Comparison table**
  - One row per PG with key numbers.
  - Tap column headers to **sort by**:
    - Monthly rent
    - Security deposit
    - Non‑veg meals per week
    - Expected missed meals per week
    - Distance to office
- **Export to CSV**
  - Export your current shortlist as a CSV file.
  - Open it in Excel/Google Sheets for deeper analysis, charts, or sharing.
- **Supabase‑backed (optional)**
  - If you configure Supabase, PGs are stored in a **real database**.
  - If you skip Supabase, it still works **locally in memory** (no backend required).

---

### Tech stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (using the Tailwind v4/Vite integration)
- **Backend / DB**: Supabase (PostgreSQL + REST/Realtime client)

---

### Running the app locally

1. **Install dependencies**

```bash
npm install
```

2. **Start the dev server**

```bash
npm run dev
```

3. **Open in browser**

Vite will show a URL in the terminal, usually:

```text
http://localhost:5173
```

Open that in your browser (mobile or desktop). You’ll see:

- A header: **PG Hunter**
- A **form** to add PG details
- A **“Your PG shortlist”** table below it

You can immediately start using the app **without any backend**. Data will be lost on refresh in this mode, but it’s perfect for quick experiments.

---

### Optional: connect to Supabase for persistence

If you want your PGs to be stored in a database and survive refreshes / multiple devices:

1. **Create a Supabase project**
   - Go to Supabase, create a new project.

2. **Create the `pgs` table**
   - In the SQL editor, run:

```sql
create table if not exists public.pgs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  monthly_rent integer not null default 0,
  security_deposit integer not null default 0,
  amenities text not null default '',
  non_veg_meals_per_week integer not null default 0,
  weekly_menu text not null default '',
  expected_missed_meals_per_week integer not null default 0,
  office_location text not null check (office_location in ('CV_NAGAR_ORACLE', 'ORACLE_TECHHUB')),
  distance_to_office_km numeric(5,2),
  address text not null default '',
  pg_type text not null check (pg_type in ('BOYS', 'COLIVE', 'OTHER')),
  terms text not null default '',
  status text not null default 'MAYBE' check (status in ('CONSIDERABLE', 'REJECTED', 'MAYBE')),
  visited boolean not null default false
);

alter table public.pgs enable row level security;

create policy "Allow read for anon"
on public.pgs
for select
to anon
using (true);

create policy "Allow insert for anon"
on public.pgs
for insert
to anon
with check (true);

create policy "Allow update for anon"
on public.pgs
for update
to anon
using (true);

create policy "Allow delete for anon"
on public.pgs
for delete
to anon
using (true);
```

If you already created the table earlier without the `status` / `visited` columns, you can add them with:

```sql
alter table public.pgs
add column if not exists status text not null default 'MAYBE' check (status in ('CONSIDERABLE', 'REJECTED', 'MAYBE'));

alter table public.pgs
add column if not exists visited boolean not null default false;
```

3. **Set environment variables**

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- `your_supabase_project_url`: in Supabase → Project Settings → API → Project URL.
- `your_supabase_anon_key`: in Supabase → Project Settings → API → anon public key.

4. **Restart the dev server**

```bash
npm run dev
```

Now the app will:

- **Load** all PGs from Supabase on start.
- **Insert / update / delete** PGs via Supabase.
- Show a small warning banner only if Supabase is **not** configured (in which case it falls back to in‑memory mode).

---

### How to use PG Hunter effectively

- **When you visit a PG**
  - Open PG Hunter on your phone.
  - Fill the form: rent, deposit, food details, distance, address, rules.
  - Save it; you now have a structured record for that PG.
- **After visiting multiple PGs**
  - Scroll down to **“Your PG shortlist”**.
  - Tap column headers to sort:
    - Sort by **rent** to see the cheapest options.
    - Sort by **non‑veg meals / week** to see who feeds you best.
    - Sort by **missed meals** or **distance** depending on your priorities.
  - If needed, **export CSV** and play with it in Excel/Sheets.
- **Decision time**
  - Filter with your brain: remove PGs with bad terms, poor food, or too far.
  - Use the numbers to break ties between 2–3 good options.

The goal is to make your PG search **less emotional, more data‑driven**, while still being extremely easy to use on the go.

---

### Future ideas

- Filters (e.g. “only CV Nagar PGs under ₹15k”).
- Estimated **monthly total cost** including electricity.
- Simple scoring system (weightage for food vs distance vs cost).
- Dark mode for night hunting.

Feel free to fork and adapt PG Hunter to your own city, company office locations, or search style. 