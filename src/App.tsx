import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

type OfficeLocation = "CV_NAGAR_ORACLE" | "ORACLE_TECHHUB";
type PgType = "BOYS" | "COLIVE" | "OTHER";

export type PgRow = {
  id: string;
  name: string;
  monthly_rent: number;
  security_deposit: number;
  amenities: string;
  non_veg_meals_per_week: number;
  weekly_menu: string;
  expected_missed_meals_per_week: number;
  office_location: OfficeLocation;
  distance_to_office_km: number | null;
  address: string;
  pg_type: PgType;
  terms: string;
  created_at?: string;
};

type SortKey =
  | "monthly_rent"
  | "security_deposit"
  | "non_veg_meals_per_week"
  | "expected_missed_meals_per_week"
  | "distance_to_office_km";

const officeLocationLabels: Record<OfficeLocation, string> = {
  CV_NAGAR_ORACLE: "CV Nagar – Oracle",
  ORACLE_TECHHUB: "Oracle TechHub",
};

const pgTypeLabels: Record<PgType, string> = {
  BOYS: "Boys PG",
  COLIVE: "CoLive / Mixed",
  OTHER: "Other",
};

function App() {
  const [pgs, setPgs] = useState<PgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("monthly_rent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState<Partial<PgRow>>({
    office_location: "CV_NAGAR_ORACLE",
    pg_type: "BOYS",
    non_veg_meals_per_week: 0,
    expected_missed_meals_per_week: 0,
  });

  const sortedPgs = useMemo(() => {
    const data = [...pgs];
    data.sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      if (av === bv) return 0;
      if (sortDir === "asc") return av < bv ? -1 : 1;
      return av > bv ? -1 : 1;
    });
    return data;
  }, [pgs, sortDir, sortKey]);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("pgs")
        .select("*")
        .order("monthly_rent", { ascending: true });
      if (err) {
        setError(err.message);
      } else if (data) {
        setPgs(
          data.map((row) => ({
            ...row,
          })) as PgRow[]
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (
    field: keyof PgRow,
    value: string | number | null
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setActiveId(null);
    setForm({
      office_location: "CV_NAGAR_ORACLE",
      pg_type: "BOYS",
      non_veg_meals_per_week: 0,
      expected_missed_meals_per_week: 0,
    });
  };

  const handleEdit = (pg: PgRow) => {
    setActiveId(pg.id);
    setForm(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!supabase) {
      setPgs((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this PG?")) return;
    const { error: err } = await supabase.from("pgs").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setPgs((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: Omit<PgRow, "id" | "created_at"> & { id?: string } = {
      name: (form.name || "").trim(),
      monthly_rent: Number(form.monthly_rent) || 0,
      security_deposit: Number(form.security_deposit) || 0,
      amenities: form.amenities || "",
      non_veg_meals_per_week: Number(form.non_veg_meals_per_week) || 0,
      weekly_menu: form.weekly_menu || "",
      expected_missed_meals_per_week:
        Number(form.expected_missed_meals_per_week) || 0,
      office_location: (form.office_location ||
        "CV_NAGAR_ORACLE") as OfficeLocation,
      distance_to_office_km:
        form.distance_to_office_km !== undefined &&
        form.distance_to_office_km !== null &&
        form.distance_to_office_km !== ("" as unknown as number)
          ? Number(form.distance_to_office_km)
          : null,
      address: form.address || "",
      pg_type: (form.pg_type || "BOYS") as PgType,
      terms: form.terms || "",
    };

    if (!payload.name) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    try {
      if (!supabase) {
        if (activeId) {
          setPgs((prev) =>
            prev.map((p) => (p.id === activeId ? { ...p, ...payload } : p))
          );
        } else {
          const newPg: PgRow = {
            ...(payload as PgRow),
            id: crypto.randomUUID(),
          };
          setPgs((prev) => [...prev, newPg]);
        }
        resetForm();
        return;
      }

      if (activeId) {
        const { data, error: err } = await supabase
          .from("pgs")
          .update(payload)
          .eq("id", activeId)
          .select()
          .single();
        if (err) throw err;
        if (data) {
          setPgs((prev) =>
            prev.map((p) => (p.id === activeId ? (data as PgRow) : p))
          );
        }
      } else {
        const { data, error: err } = await supabase
          .from("pgs")
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        if (data) {
          setPgs((prev) => [...prev, data as PgRow]);
        }
      }
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save PG details.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const handleExportCsv = () => {
    if (!pgs.length) return;

    const headers = [
      "Name",
      "Monthly Rent",
      "Security Deposit",
      "Amenities",
      "Non-veg Meals / Week",
      "Weekly Menu",
      "Expected Missed Meals / Week",
      "Office Location",
      "Distance To Office (km)",
      "Address",
      "PG Type",
      "Terms",
    ];

    const rows = sortedPgs.map((pg) => [
      pg.name,
      pg.monthly_rent,
      pg.security_deposit,
      pg.amenities,
      pg.non_veg_meals_per_week,
      pg.weekly_menu,
      pg.expected_missed_meals_per_week,
      officeLocationLabels[pg.office_location],
      pg.distance_to_office_km ?? "",
      pg.address,
      pgTypeLabels[pg.pg_type],
      pg.terms,
    ]);

    const escapeCell = (cell: unknown) => {
      if (cell === null || cell === undefined) return "";
      const str = String(cell);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent =
      [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.download = `pg-hunter-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:pt-6">
        <header className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
          <div>
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">
              PG Hunter
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Compare PGs on rent, food, distance, and more. Optimised for your
              Oracle offices.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-50">
            Mobile-first
          </span>
        </header>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!supabase && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Supabase is not configured yet. Add{" "}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
            to your <code>.env</code> file to enable sync. For now, data is
            stored only in memory.
          </div>
        )}

        <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-base font-semibold sm:text-lg">
            {activeId ? "Edit PG" : "Add a PG"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Fill this once per PG. All fields are designed around your decision
            factors.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                PG name / short label
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none ring-0 transition focus:bg-white focus:border-slate-400"
                value={form.name ?? ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. CoLive Orion, Sai Comfort, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Monthly rent (₹)
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                  value={form.monthly_rent ?? ""}
                  onChange={(e) =>
                    handleChange("monthly_rent", Number(e.target.value))
                  }
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Security deposit (₹)
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                  value={form.security_deposit ?? ""}
                  onChange={(e) =>
                    handleChange("security_deposit", Number(e.target.value))
                  }
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Non-veg meals / week
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                  value={form.non_veg_meals_per_week ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "non_veg_meals_per_week",
                      Number(e.target.value)
                    )
                  }
                  min={0}
                  max={21}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Times you&apos;ll miss meals / week
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                  value={form.expected_missed_meals_per_week ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "expected_missed_meals_per_week",
                      Number(e.target.value)
                    )
                  }
                  min={0}
                  max={21}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Amenities
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                value={form.amenities ?? ""}
                onChange={(e) => handleChange("amenities", e.target.value)}
                placeholder="WiFi, washing machine, attached bathroom, AC, housekeeping, etc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Weekly food menu
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                value={form.weekly_menu ?? ""}
                onChange={(e) => handleChange("weekly_menu", e.target.value)}
                placeholder="Mon: Idli/Dosa, Tue: Poori, ...; highlight non-veg days."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nearest office
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-slate-400"
                  value={form.office_location ?? "CV_NAGAR_ORACLE"}
                  onChange={(e) =>
                    handleChange(
                      "office_location",
                      e.target.value as OfficeLocation
                    )
                  }
                >
                  {Object.entries(officeLocationLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Distance to office (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                  value={form.distance_to_office_km ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "distance_to_office_km",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  PG type
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-slate-400"
                  value={form.pg_type ?? "BOYS"}
                  onChange={(e) =>
                    handleChange("pg_type", e.target.value as PgType)
                  }
                >
                  {Object.entries(pgTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Address
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                value={form.address ?? ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Full address or Google Maps short description."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Other terms &amp; conditions
              </label>
              <textarea
                className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner outline-none focus:bg-white focus:border-slate-400"
                value={form.terms ?? ""}
                onChange={(e) => handleChange("terms", e.target.value)}
                placeholder="Lock-in period, notice period, guest policy, curfew, electricity charges, etc."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving
                  ? activeId
                    ? "Saving..."
                    : "Adding..."
                  : activeId
                  ? "Save changes"
                  : "Add PG"}
              </button>
              {activeId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">
                Your PG shortlist
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tap headers to sort by cost, food or distance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {loading ? "Loading..." : `${pgs.length} saved`}
              </span>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!pgs.length}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {pgs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              No PGs added yet. Start by filling the form above with the details
              of the first PG you visit.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 sm:text-xs">
                  <tr>
                    <th className="px-2 py-2">PG</th>
                    <th
                      className="cursor-pointer px-2 py-2"
                      onClick={() => toggleSort("monthly_rent")}
                    >
                      Rent ₹ {sortIcon("monthly_rent")}
                    </th>
                    <th
                      className="cursor-pointer px-2 py-2"
                      onClick={() => toggleSort("security_deposit")}
                    >
                      Deposit ₹ {sortIcon("security_deposit")}
                    </th>
                    <th
                      className="cursor-pointer px-2 py-2"
                      onClick={() => toggleSort("non_veg_meals_per_week")}
                    >
                      Non-veg / wk {sortIcon("non_veg_meals_per_week")}
                    </th>
                    <th
                      className="cursor-pointer px-2 py-2"
                      onClick={() =>
                        toggleSort("expected_missed_meals_per_week")
                      }
                    >
                      Missed / wk{" "}
                      {sortIcon("expected_missed_meals_per_week")}
                    </th>
                    <th
                      className="cursor-pointer px-2 py-2"
                      onClick={() => toggleSort("distance_to_office_km")}
                    >
                      Dist (km) {sortIcon("distance_to_office_km")}
                    </th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPgs.map((pg) => (
                    <tr
                      key={pg.id}
                      className={
                        activeId === pg.id
                          ? "bg-slate-50/80"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="max-w-[140px] px-2 py-2 align-top">
                        <div className="text-xs font-semibold text-slate-900">
                          {pg.name}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                          {officeLocationLabels[pg.office_location]}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
                          {pg.address}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top text-xs text-slate-800">
                        ₹{pg.monthly_rent.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 align-top text-xs text-slate-800">
                        ₹{pg.security_deposit.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 align-top text-xs">
                        {pg.non_veg_meals_per_week}
                      </td>
                      <td className="px-2 py-2 align-top text-xs">
                        {pg.expected_missed_meals_per_week}
                      </td>
                      <td className="px-2 py-2 align-top text-xs">
                        {pg.distance_to_office_km ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top text-[11px] text-slate-700">
                        {pgTypeLabels[pg.pg_type]}
                      </td>
                      <td className="px-2 py-2 align-top text-[11px]">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(pg)}
                            className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-50 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pg.id)}
                            className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
