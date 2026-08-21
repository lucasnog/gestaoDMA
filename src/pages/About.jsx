import React, { useEffect, useState } from 'react';
import { Mail, Phone, Calendar, User } from 'lucide-react';
import Card from '../components/ui/Card';
import { getDatabaseUpdatedAt } from '../services/api.service';

const InfoRow = ({ icon: Icon, iconBg, label, children }) => (
  <div className="flex items-start gap-4 py-3 px-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors duration-150">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
      <Icon size={16} className="text-white" strokeWidth={2} />
    </div>
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      {children}
    </div>
  </div>
);

const About = () => {
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    getDatabaseUpdatedAt()
      .then(d => {
        if (d) {
          setLastUpdate(
            new Date(d + 'Z').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-lg mx-auto mt-6 sm:mt-10 px-4">
      <Card className="p-6 sm:p-8 border border-slate-200 shadow-sm rounded-2xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xl tracking-tight">G</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">GEMOC Analytics</h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitoramento de contratos · GEMOC</p>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-3">

          <InfoRow icon={User} iconBg="bg-emerald-600" label="Criado e gerenciado por">
            <p className="text-sm font-semibold text-slate-900">Lucas Nogueira Lopes</p>
            <p className="text-xs font-medium text-emerald-600 mt-0.5">GEMOC</p>
          </InfoRow>

          <InfoRow icon={Phone} iconBg="bg-blue-500" label="Telefone">
            <a
              href="tel:+5562994118103"
              className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
            >
              (62) 99411-8103
            </a>
          </InfoRow>

          <InfoRow icon={Mail} iconBg="bg-purple-500" label="E-mail">
            <a
              href="mailto:englucasnog@gmail.com"
              className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition-colors break-all"
            >
              englucasnog@gmail.com
            </a>
          </InfoRow>

          <InfoRow icon={Calendar} iconBg="bg-amber-500" label="Última atualização dos dados">
            <p className="text-sm font-semibold text-slate-900">
              {lastUpdate ?? (
                <span className="text-slate-400 font-normal animate-pulse">Carregando...</span>
              )}
            </p>
          </InfoRow>

        </div>
      </Card>
    </div>
  );
};

export default About;
