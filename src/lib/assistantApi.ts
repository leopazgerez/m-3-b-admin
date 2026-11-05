import { api } from "./api";
import type { AskAccepted, ChatSummary, ChatView, GuideSectionView } from "./apiTypes";

export { MAX_FILE_BYTES, MAX_QUESTION, MAX_SECTION_NAME } from "./assistantTurn";

function sectionForm(p: { name?: string; file?: File }): FormData {
  const f = new FormData();
  if (p.name !== undefined) f.set("name", p.name);
  if (p.file) f.set("file", p.file);
  return f;
}

/** Ask endpoints answer 202 {requestId}; the answer streams over the socket. Their errors are shown in the panel (silent). */
export const assistantApi = {
  createChat: () => api.post<ChatSummary>("/chats", undefined, { quiet: true, isolated: true }),
  deleteChat: (id: number) => api.del(`/chats/${id}`, { success: "Chat eliminado", isolated: true }),
  getChat: (id: number) => api.getOne<ChatView>(`/chats/${id}`, undefined, { quiet: true }),
  askChat: (id: number, question: string) =>
    api.post<AskAccepted>(`/chats/${id}/messages`, { question }, { silent: true, quiet: true, isolated: true }),
  askGuide: (question: string) => api.post<AskAccepted>("/guide/ask", { question }, { silent: true, quiet: true, isolated: true }),

  listSections: () => api.getOne<GuideSectionView[]>("/guide/sections"),
  getSection: (id: number) => api.getOne<GuideSectionView>(`/guide/sections/${id}`),
  createSection: (name: string, file: File) =>
    api.postForm<GuideSectionView>("/guide/sections", sectionForm({ name, file }), { success: "Sección cargada", silent: true, isolated: true }),
  updateSection: (id: number, p: { name?: string; file?: File }) =>
    api.putForm<GuideSectionView>(`/guide/sections/${id}`, sectionForm(p), { success: "Sección actualizada", silent: true, isolated: true }),
  deleteSection: (id: number) => api.del(`/guide/sections/${id}`, { success: "Sección eliminada", isolated: true }),
};
