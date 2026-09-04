import React from 'react';
import { MessageCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-100 text-slate-500 text-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start mb-10">
          
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <img src="/logo-mrbob%202.png" alt="Academia English School" className="h-9 w-auto object-contain" />
              <span className="font-extrabold text-base text-slate-900">Academia English School - Pare</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Pusat Pendidikan Bahasa Inggris di Pare untuk persiapan IELTS, English course, dan konsultasi belajar.
            </p>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400">
              <span>364 ulasan</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2.5 md:text-center">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Alamat</h4>
            <ul className="mx-auto max-w-sm space-y-2">
              <li>
                Jl. Pancawarna, Mulyoasri, Tulungrejo, Kec. Pare, Kabupaten Kediri, Jawa Timur 64212
              </li>
              <li>65WQ+6R Tulungrejo, Kabupaten Kediri, Jawa Timur</li>
            </ul>
          </div>

          {/* Col 3: WhatsApp Support */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Kontak</h4>
            <a href="http://mrbobacademia.com/" target="_blank" rel="noreferrer" className="block font-bold text-blue-600 hover:text-blue-700">
              mrbobacademia.com
            </a>
            <a
              href="https://wa.me/6282131953578"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 font-bold px-3.5 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all text-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>0821-3195-3578</span>
            </a>
            <p className="text-xs font-bold text-emerald-700">Buka · Tutup pukul 16.00</p>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <p>
            © {new Date().getFullYear()} Academia English School - Pare. All rights reserved.
          </p>
          <p className="text-center sm:text-right">
            IELTS is a registered trademark of University of Cambridge, British Council, and IDP Education.
          </p>
        </div>

      </div>
    </footer>
  );
};
