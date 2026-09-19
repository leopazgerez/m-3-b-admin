"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@matestripleb.com");
  const [password, setPassword] = useState("••••••••");
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
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
            <img
              src="/favicon.png"
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
              <img
                src="/favicon.png"
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

            {/* Options */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-[#7A6F63] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-[#E7DFD2] text-[#9C5A2E] focus:ring-[#9C5A2E]"
                />
                <span>Recordarme</span>
              </label>
              <button
                type="button"
                className="text-[#9C5A2E] hover:underline font-semibold"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 flex items-center justify-center gap-2 bg-[#9C5A2E] text-white py-3 rounded-xl font-semibold text-xs hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <span>Ingresar al panel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E7DFD2]" />
            <span className="text-[11px] text-[#A89C8C] uppercase font-medium">
              o continuar con
            </span>
            <div className="flex-1 h-px bg-[#E7DFD2]" />
          </div>

          {/* Google Button */}
          <button
            onClick={() => router.push("/dashboard")}
            type="button"
            className="flex items-center justify-center gap-2.5 bg-[#FBF8F2] border border-[#E7DFD2] py-2.5 rounded-xl font-medium text-xs text-[#231E1A] hover:bg-white hover:border-[#A89C8C] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Workspace</span>
          </button>

          <p className="text-center text-[11px] text-[#7A6F63]">
            ¿No tenés una cuenta de administrador?{" "}
            <Link href="/login" className="text-[#9C5A2E] font-semibold hover:underline">
              Contactar al soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
