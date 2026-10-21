export default function PendingApi({ title, endpoint }: { title: string; endpoint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E7DFD2] bg-[#FBF8F2] p-6">
      <p className="font-heading font-semibold text-[#7A3F1F]">{title}</p>
      <p className="mt-1 text-sm text-[#7A6F63]">Pendiente de API</p>
      <code className="mt-2 inline-block text-xs text-[#7A6F63]">{endpoint}</code>
    </div>
  );
}
