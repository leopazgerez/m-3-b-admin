"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { getAssetPath } from "@/lib/assets";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { ApiErrorBanner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (getSession()) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F7F3EC]">
      {/* Left Panel - Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#211C18] text-[#F5EAD6] p-12 flex-col justify-between overflow-hidden">
        {/* Background gradient texture & warm glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7A3F1F]/40 via-[#211C18] to-[#15110E] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#9C5A2E]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#C87941]/20 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg p-0.5 border border-[#322A23] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAssetPath("/favicon.png")}
              alt="Mates Triple B"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-[#F5EAD6]">
            Mates Triple B
          </span>
        </div>

        {/* Value Prop */}
        <div className="relative z-10 flex flex-col gap-4 max-w-md">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#C87941]">
            Panel de control artesanal
          </span>
          <h2 className="font-heading font-extrabold text-4xl text-[#F5EAD6] leading-tight">
            Gestión simple para un negocio que crece mate a mate.
          </h2>
          <p className="text-sm text-[#C9BCA9] leading-relaxed">
            Monitoreá tus ventas, controlá el inventario de calabazas, cueros y virolas, y administrá tus clientes desde una única plataforma.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-[#A89C8C]">
          © {new Date().getFullYear()} Mates Triple B · Calidad Bueno, Bonito y Barato
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E7DFD2] p-8 shadow-xs flex flex-col gap-6">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center gap-3 pb-2 border-b border-[#F7F3EC]">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-2xs p-0.5 border border-[#E7DFD2] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAssetPath("/favicon.png")}
                alt="Mates Triple B"
                className="w-full h-full object-contain rounded-md"
              />
            </div>
            <span className="font-heading font-bold text-base text-[#231E1A]">
              Mates Triple B
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-heading font-bold text-2xl text-[#231E1A] tracking-tight">
              Bienvenido de nuevo
            </h3>
            <p className="text-xs text-[#7A6F63]">
              Ingresá tus credenciales para acceder al panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            {/* Email */}
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Correo electrónico
              </label>
              <div className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 transition-all focus-within:border-[#9C5A2E] focus-within:bg-white">
                <Mail className="w-4 h-4 text-[#A89C8C] shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@matestripleb.com"
                  className="bg-transparent border-none outline-none w-full text-xs text-[#231E1A]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Contraseña
              </label>
              <div className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 transition-all focus-within:border-[#9C5A2E] focus-within:bg-white">
                <Lock className="w-4 h-4 text-[#A89C8C] shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none w-full text-xs text-[#231E1A]"
                />
              </div>
            </div>

            {error != null && (
              error instanceof ApiError && error.status === 401 ? (
                <div role="alert" className="rounded-xl border border-[#C0492F]/30 bg-[#F7E3DD] px-4 py-3 text-[#C0492F]">
                  Email o contraseña incorrectos
                </div>
              ) : (
                <ApiErrorBanner error={error} />
              )
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex disabled:opacity-60 disabled:cursor-not-allowed items-center justify-center gap-2 bg-[#9C5A2E] text-white py-3 rounded-xl font-semibold text-xs hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <span>Ingresar al panel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
