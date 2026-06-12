import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  ALL_CATEGORY_FILTER,
  normalizeCategoryFilterName,
  validateCategoryFilterNames,
} from "@/lib/productCategories";
import {
  saveCatalogCategoryFilters,
  type CategoryFilterRename,
} from "@/services/catalogSettingsService";

type FilterRow = {
  id: string;
  name: string;
  originalName: string;
};

type CategoryFiltersEditorProps = {
  filters: string[];
  onSaved: () => void;
};

function rowsFromFilters(filters: string[]): FilterRow[] {
  return filters.map((name) => ({
    id: crypto.randomUUID(),
    name,
    originalName: name,
  }));
}

export function CategoryFiltersEditor({
  filters,
  onSaved,
}: CategoryFiltersEditorProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FilterRow[]>(() => rowsFromFilters(filters));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRows(rowsFromFilters(filters));
  }, [filters]);

  function updateRowName(id: string, name: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, name } : row)),
    );
    setMessage(null);
    setError(null);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setMessage(null);
    setError(null);
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "", originalName: "" },
    ]);
    setMessage(null);
    setError(null);
  }

  async function handleSave() {
    const names = rows.map((row) => normalizeCategoryFilterName(row.name));
    const validationError = validateCategoryFilterNames(names);
    if (validationError) {
      setError(validationError);
      return;
    }

    const renames: CategoryFilterRename[] = [];
    for (const row of rows) {
      const next = normalizeCategoryFilterName(row.name);
      const prev = normalizeCategoryFilterName(row.originalName);
      if (prev && prev !== next) {
        renames.push({ from: prev, to: next });
      }
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      await saveCatalogCategoryFilters(client, names, renames);
      setMessage("Category filters saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save filters");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <div className="mb-3">
        <h2 className="font-headline-md text-on-surface">Category filters</h2>
        <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
          These filters appear on the shop and admin product list.{" "}
          <strong className="text-on-surface">{ALL_CATEGORY_FILTER}</strong> is
          always available. Removing a filter does not change products — they
          only show under {ALL_CATEGORY_FILTER}.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="bg-primary px-3 py-1.5 font-label-sm uppercase text-on-primary">
          {ALL_CATEGORY_FILTER}
        </span>
        <span className="font-label-sm uppercase text-on-surface-variant">
          Required
        </span>
      </div>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center font-label-sm text-on-surface-variant">
              {index + 1}
            </span>
            <input
              value={row.name}
              disabled={saving}
              onChange={(e) => updateRowName(row.id, e.target.value)}
              placeholder="Filter name"
              className="min-w-0 flex-1 border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-body-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => removeRow(row.id)}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-error transition-colors hover:bg-error/10 disabled:opacity-50"
              aria-label="Remove filter"
              title="Remove filter"
            >
              <Icon name="close" className="text-base" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={addRow}
          className="border border-outline-variant/30 px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          + Add filter
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="bg-primary px-4 py-1.5 font-label-sm uppercase text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save filters"}
        </button>
      </div>

      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}
      {message && (
        <p className="mt-2 text-body-sm text-on-surface-variant" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
