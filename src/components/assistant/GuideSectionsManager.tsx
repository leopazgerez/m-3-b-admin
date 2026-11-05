"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal } from "@/components/ui";
import { ApiError } from "@/lib/api";
import type { GuideSectionView } from "@/lib/apiTypes";
import { formatInstant } from "@/lib/dateUtils";
import { MAX_SECTION_NAME } from "@/lib/assistantTurn";
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

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const nameFromFile = (f: File) => f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim().slice(0, MAX_SECTION_NAME);

/** New: name and PDF required. Replace: name and/or PDF; only what changed is sent. */
function SectionForm({ section, onClose, onSave }: {
  section: GuideSectionView | null;
  onClose: () => void;
  onSave: (name: string | undefined, file: File | undefined) => Promise<unknown>;
}) {
  const isNew = section === null;
  const [name, setName] = useState(section?.name ?? "");
  const [nameTouched, setNameTouched] = useState(!isNew);
  const [file, setFile] = useState<File | undefined>();
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState<FormError>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sentName = isNew || name !== section.name ? name : undefined;
  const hasChanges = isNew ? name.trim() !== "" && file !== undefined : sentName !== undefined || file !== undefined;

  const pick = (f: File | undefined) => {
    if (!f) return;
    const invalid = validateSectionInput(undefined, f, false);
    if (invalid?.field === "file") { setErr(invalid); setFile(undefined); return; }
    setErr(null);
    setFile(f);
    if (!nameTouched) setName(nameFromFile(f)); // a sensible default the user can still edit
  };
  const clearFile = () => {
    setFile(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const fieldErr = (f: "name" | "file") =>
    err?.field === f && <p className="flex items-center gap-1 text-[11px] font-medium text-red-700"><AlertCircle className="h-3.5 w-3.5" />{err.message}</p>;

  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title={isNew ? "Subir sección del manual" : `Reemplazar «${section.name}»`}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {err && !err.field && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{err.message}</p>
        )}

        {/* 1. file */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#231E1A]">
            1. Archivo PDF {!isNew && <span className="font-normal text-[#7A6F63]">(opcional)</span>}
          </span>
          {!isNew && !file && (
            <p className="flex items-center gap-2 rounded-xl bg-[#FBF8F2] px-3 py-2 text-[11px] text-[#7A6F63]">
              <FileText className="h-4 w-4 shrink-0 text-[#9C5A2E]" />
              Contenido actual: {section.characters.toLocaleString("es-AR")} caracteres, actualizado el {formatInstant(section.updatedAt)}.
              Subí un PDF nuevo solo si querés reemplazarlo.
            </p>
          )}
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#3E8E5A]/40 bg-[#E3F1E8] px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#3E8E5A]"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#231E1A]">{file.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-[#3E8E5A]"><CheckCircle2 className="h-3.5 w-3.5" />{formatSize(file.size)} · listo para subir</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={saving} className="text-[11px] font-semibold text-[#9C5A2E] hover:underline">
                Cambiar
              </button>
              <button type="button" onClick={clearFile} disabled={saving} aria-label="Quitar archivo" className="rounded p-1 text-[#7A6F63] hover:bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                err?.field === "file" ? "border-red-300 bg-red-50/50"
                : dragging ? "border-[#9C5A2E] bg-[#F5EAD6]" : "border-[#E7DFD2] bg-[#FBF8F2] hover:border-[#9C5A2E]"
              }`}
            >
              <UploadCloud className={`h-8 w-8 ${dragging ? "text-[#9C5A2E]" : "text-[#A89C8C]"}`} />
              <span className="text-xs font-semibold text-[#231E1A]">
                {dragging ? "Soltá el archivo acá" : <>Arrastrá el PDF acá o <span className="text-[#9C5A2E] underline">elegilo de tu equipo</span></>}
              </span>
              <span className="text-[11px] text-[#7A6F63]">Solo PDF con texto (no escaneado) · hasta 10 MB</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {fieldErr("file")}
        </div>

        {/* 2. name */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#231E1A]">2. Nombre de la sección</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
            maxLength={MAX_SECTION_NAME}
            placeholder="Ej.: Cómo registrar una venta"
            className={`${inputCls} ${err?.field === "name" ? "border-red-300" : ""}`}
          />
          <span className="flex justify-between text-[11px] text-[#7A6F63]">
            <span>{isNew && file && !nameTouched ? "Lo tomamos del archivo; podés cambiarlo." : "El asistente lo cita cuando usa esta sección."}</span>
            <span>{name.length}/{MAX_SECTION_NAME}</span>
          </span>
          {fieldErr("name")}
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-[#E7DFD2] pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-3 py-2 text-xs font-medium text-[#7A6F63] hover:bg-[#FBF8F2]">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 rounded-lg bg-[#9C5A2E] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {file ? "Subiendo y leyendo el PDF…" : "Guardando…"}</>
              : <><UploadCloud className="h-4 w-4" /> {isNew ? "Subir y guardar" : "Guardar cambios"}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
