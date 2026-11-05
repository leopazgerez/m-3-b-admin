"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal } from "@/components/ui";
import { ApiError } from "@/lib/api";
import type { GuideSectionView } from "@/lib/apiTypes";
import { formatInstant } from "@/lib/dateUtils";
import { useGuideSections, validateSectionInput } from "@/lib/useAssistant";

const inputCls = "bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white min-w-0";
const tab = "px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap";
const btn = "text-xs font-semibold text-[#9C5A2E] hover:underline";

type Editing = "new" | GuideSectionView | null;
type FormError = { field?: "name" | "file"; message: string } | null;

export default function GuideSectionsManager() {
  const { sections, loading, error, reload, get, create, update, remove } = useGuideSections();
  const [editing, setEditing] = useState<Editing>(null);
  const [viewing, setViewing] = useState<GuideSectionView | null>(null);
  const [viewError, setViewError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState<GuideSectionView | null>(null);

  // the section whose content is being fetched; a response for any other (closed, or replaced by a later click) is dropped
  const viewingId = useRef<number | null>(null);
  const openView = async (s: GuideSectionView) => {
    viewingId.current = s.id;
    setViewError(null);
    setViewing(s);
    try {
      const full = await get(s.id);
      if (viewingId.current === s.id) setViewing(full);
    } catch (e) {
      if (viewingId.current === s.id) setViewError(e);
    }
  };
  const closeView = () => { viewingId.current = null; setViewing(null); };

  return (
    <>
      <Topbar title="Configuración / Guía de usuario" subtitle="Manual en PDF que usa el asistente para responder" />
      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full">
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link href="/configuracion" className={tab}>General</Link>
          <Link href="/configuracion/producto" className={tab}>Producto (Categorías)</Link>
          <Link href="/configuracion/venta" className={tab}>Cobros</Link>
          <Link href="/configuracion/gastos" className={tab}>Gastos (Categorías)</Link>
          <Link href="/configuracion/guia" className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap">
            Guía de usuario
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs">
          <div className="flex items-center justify-between p-4 border-b border-[#E7DFD2]">
            <h3 className="font-heading font-bold text-sm text-[#231E1A]">Secciones del manual</h3>
            <button type="button" onClick={() => setEditing("new")} className="rounded-lg bg-[#9C5A2E] px-3 py-1.5 text-xs font-semibold text-white">
              Subir sección
            </button>
          </div>
          {error && <div className="p-4"><ApiErrorBanner error={error} onRetry={reload} /></div>}
          {!error && !loading && sections.length === 0 && <p className="p-4 text-xs text-[#7A6F63]">Todavía no hay secciones cargadas.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id} className="border-b border-[#E7DFD2] last:border-0">
                    <td className="px-4 py-3 font-semibold text-[#231E1A]">{s.name}</td>
                    <td className="px-4 py-3 text-[#7A6F63] whitespace-nowrap">{s.characters.toLocaleString("es-AR")} caracteres</td>
                    <td className="px-4 py-3 text-[#7A6F63] whitespace-nowrap">{formatInstant(s.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button type="button" className={btn} onClick={() => openView(s)}>Ver</button>
                        <button type="button" className={btn} onClick={() => setEditing(s)}>Reemplazar</button>
                        <button type="button" className="text-xs font-semibold text-red-700 hover:underline" onClick={() => setDeleting(s)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editing && (
        <SectionForm
          key={editing === "new" ? "new" : editing.id}
          section={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(name, file) => (editing === "new" ? create(name!, file!) : update(editing.id, { name, file }))}
        />
      )}

      <Modal isOpen={viewing !== null} onClose={closeView} title={viewing?.name ?? ""} maxWidth="max-w-3xl">
        {viewError ? <ApiErrorBanner error={viewError} /> : (
          <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-body text-xs text-[#231E1A]">
            {viewing?.content ?? "Cargando…"}
          </pre>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (deleting) await remove(deleting.id).catch(() => {}); setDeleting(null); }}
        title="¿Borrar esta sección?"
        itemName={deleting?.name}
        description="El asistente deja de usarla para responder."
      />
    </>
  );
}

/** New: name and PDF required. Replace: name and/or PDF; only what changed is sent. */
function SectionForm({ section, onClose, onSave }: {
  section: GuideSectionView | null;
  onClose: () => void;
  onSave: (name: string | undefined, file: File | undefined) => Promise<unknown>;
}) {
  const [name, setName] = useState(section?.name ?? "");
  const [file, setFile] = useState<File | undefined>();
  const [err, setErr] = useState<FormError>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = section === null;
    const sentName = isNew || name !== section.name ? name : undefined;
    const invalid = validateSectionInput(sentName, file, isNew);
    if (invalid) { setErr(invalid); return; }
    setErr(null);
    setSaving(true);
    try {
      await onSave(sentName?.trim(), file);
      onClose();
    } catch (e) {
      const field = e instanceof ApiError && (e.field === "name" || e.field === "file") ? e.field : undefined;
      setErr({ field, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const fieldErr = (f: "name" | "file") => err?.field === f && <p className="text-[11px] text-red-700">{err.message}</p>;

  return (
    <Modal isOpen onClose={onClose} title={section ? `Reemplazar «${section.name}»` : "Subir sección"}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {err && !err.field && <p className="text-xs text-red-700">{err.message}</p>}
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#231E1A]">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} />
          {fieldErr("name")}
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#231E1A]">
          Archivo PDF (hasta 10 MB){section && <span className="font-normal text-[#7A6F63]">Dejalo vacío para mantener el actual.</span>}
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0])} className="text-xs" />
          {fieldErr("file")}
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs text-[#7A6F63]">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#9C5A2E] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
