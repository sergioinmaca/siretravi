import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCampamento } from '../../context/CampamentoContext';
import { Stethoscope, Pill, ArrowLeft } from 'lucide-react';

const submodulos = [
  {
    path: '/salud/historias-clinicas',
    icon: Stethoscope,
    title: 'Historias Clinicas',
    description: 'Registro medico completo de cada refugiado. Abra historias clinicas, registre atenciones medicas y documente examenes fisicos.',
    color: 'bg-caracas-red',
    iconBg: 'bg-caracas-red/10',
    iconColor: 'text-caracas-red',
  },
  {
    path: '/salud/regimen-diario',
    icon: Pill,
    title: 'Regimen Diario',
    description: 'Visualice los pacientes con tratamientos de por vida y sus medicamentos ordenados por horario a lo largo del dia.',
    color: 'bg-caracas-blue',
    iconBg: 'bg-caracas-blue/10',
    iconColor: 'text-caracas-blue',
  },
];

export default function SaludIndex() {
  const navigate = useNavigate();
  const { campamentoSeleccionado } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const campId = campamentoSeleccionado?.id || '';

  if (!tienePermisoPorCampamento('Salud', campId, 'Ver')) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <Stethoscope size={64} strokeWidth={1} />
        <p className="text-lg font-medium">No tienes acceso al modulo de Salud</p>
        <p className="text-sm">Contacta al administrador para solicitar permisos</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Modulo de Salud</h1>
        <p className="text-gray-500 mt-2">
          Campamento: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {submodulos.map((sub) => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.path}
              onClick={() => navigate(sub.path)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-8 text-left group overflow-hidden relative"
            >
              <div className={`absolute top-0 left-0 w-2 h-full ${sub.color} rounded-l-full`} />
              <div className="flex items-start gap-6">
                <div className={`p-4 ${sub.iconBg} rounded-2xl shrink-0`}>
                  <Icon size={36} className={sub.iconColor} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-caracas-red transition-colors mb-2">
                    {sub.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">
                    {sub.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
