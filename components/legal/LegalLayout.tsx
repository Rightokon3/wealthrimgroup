'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, ChevronRight, Mail, ArrowUp, ListChecks } from 'lucide-react';

export type LegalSection = { id: string; title: string; body: ReactNode };

/* ── small building blocks used by the pages ───────────────────────── */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-gray-600 mb-4">{children}</p>;
}
export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mt-6 mb-2">{children}</h3>;
}
export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-7 text-gray-600">
          <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 p-4 rounded-2xl bg-orange-50 border border-orange-100 text-sm leading-6 text-orange-900">{children}</div>
  );
}

/* ── the page frame ────────────────────────────────────────────────── */
export default function LegalLayout({
  variant, title, updated, intro, summary, sections, other, contactEmail,
}: {
  variant: 'privacy' | 'terms';
  title: string;
  updated: string;
  intro: string;
  summary?: string[];
  sections: LegalSection[];
  other: { href: string; label: string };
  contactEmail: string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const Icon = variant === 'privacy' ? ShieldCheck : FileText;

  // highlight the section you are reading in the contents list
  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: '-15% 0px -75% 0px' },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  const toc = (
    <nav className="space-y-0.5">
      {sections.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} onClick={go(s.id)}
          className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold leading-snug transition-all ${
            active === s.id ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
          <span className={`mt-px text-[11px] font-black w-5 flex-shrink-0 ${active === s.id ? 'text-orange-500' : 'text-gray-300'}`}>{i + 1}</span>
          <span>{s.title}</span>
        </a>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-black/10 blur-3xl" />
        <div className="relative max-w-[1000px] mx-auto px-6 py-12 sm:py-14">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-100 mb-4">
            <Link href="/" className="hover:text-white">Home</Link><ChevronRight className="w-3 h-3" /><span>Legal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">{title}</h1>
              <p className="text-orange-100 text-sm mt-1">Last updated {updated}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Contents (desktop: sticky side list, mobile: fold-out) */}
          <aside className="lg:col-span-1">
            <details className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm mb-2 group">
              <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3.5 text-sm font-black text-gray-900">
                <span className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-orange-500" />Jump to a section</span>
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-2 pb-3">{toc}</div>
            </details>
            <div className="hidden lg:block sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <p className="px-3 pt-1 pb-2 text-[11px] font-black text-gray-400 uppercase tracking-wider">On this page</p>
              {toc}
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <p className="text-[15px] leading-7 text-gray-600">{intro}</p>
              {summary && (
                <div className="mt-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5">
                  <p className="text-sm font-black text-gray-900 mb-3">The short version</p>
                  <ul className="space-y-2">
                    {summary.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-6 text-gray-700">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 divide-y divide-gray-100">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24 py-7 first:pt-0 last:pb-0">
                  <h2 className="flex items-baseline gap-3 text-xl font-black text-gray-900 mb-4">
                    <span className="text-sm font-black text-orange-500">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  {s.body}
                </section>
              ))}
            </div>

            {/* Contact + other document */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3"><Mail className="w-5 h-5" /></div>
                <p className="font-black text-gray-900 text-sm">Questions?</p>
                <p className="text-sm text-gray-500 mt-1">Write to us and a real person will reply.</p>
                <a href={`mailto:${contactEmail}`} className="inline-block mt-3 text-sm font-bold text-orange-600 hover:underline">{contactEmail}</a>
              </div>
              <Link href={other.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-orange-200 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                  {variant === 'privacy' ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <p className="font-black text-gray-900 text-sm">Also read</p>
                <p className="text-sm text-gray-500 mt-1">{other.label}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-orange-600 group-hover:gap-2 transition-all">Open <ChevronRight className="w-4 h-4" /></span>
              </Link>
            </div>

            <div className="text-center pt-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-orange-500 transition-colors">
                <ArrowUp className="w-3.5 h-3.5" /> Back to top
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}