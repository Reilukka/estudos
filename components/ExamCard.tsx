
import React, { useState } from 'react';
import { Briefcase, Users, AlertCircle, Calendar, DollarSign, History, Clock, ExternalLink, Heart, BookOpen, GraduationCap, ChevronDown, ChevronUp, CheckCircle, Circle, Sparkles, TrendingUp } from 'lucide-react';
import { ExamData } from '../types';

interface ExamCardProps {
  data: ExamData;
  sources?: { title: string; uri: string }[];
  isSaved?: boolean;
  onToggleSave?: () => void;
  onStartSimulation: () => void;
  onStudyTopic: (subjectName: string, topicName: string) => void;
  onRoleSelect?: (role: string) => void;
  onToggleTopicCompletion?: (topicName: string) => void;
  isUpdatingRole?: boolean;
}

const ExamCard: React.FC<ExamCardProps> = ({ 
  data, 
  sources, 
  isSaved, 
  onToggleSave, 
  onStartSimulation,
  onStudyTopic,
  onRoleSelect,
  onToggleTopicCompletion,
  isUpdatingRole
}) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-6 text-white relative overflow-hidden">
           {/* Abstract Pattern */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="w-full pr-4">
                <h2 className="text-3xl font-bold mb-3">{data.title}</h2>
                <div className="flex flex-wrap gap-3 text-sm font-medium items-center">
                    <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                        <Briefcase size={16} /> Banca: {data.organization}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                        <Users size={16} /> Vagas: {data.estimatedVacancies}
                    </span>
                    
                    {/* Role Selector */}
                    {data.availableRoles && data.availableRoles.length > 0 && (
                      <div className="relative ml-0 sm:ml-2 mt-2 sm:mt-0">
                         <select 
                            value={data.selectedRole || ""} 
                            onChange={(e) => onRoleSelect && onRoleSelect(e.target.value)}
                            disabled={isUpdatingRole}
                            className="appearance-none bg-white text-indigo-900 pl-4 pr-10 py-1.5 rounded-lg font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer disabled:opacity-50"
                         >
                            <option value="" disabled>Selecione seu Cargo/Vaga</option>
                            {data.availableRoles.map((role, idx) => (
                                <option key={idx} value={role}>{role}</option>
                            ))}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-900 pointer-events-none" size={14} />
                      </div>
                    )}
                </div>
              </div>
              {onToggleSave && (
                <button 
                    onClick={onToggleSave}
                    className={`p-3 rounded-full backdrop-blur-sm transition-all flex-shrink-0 ${
                        isSaved ? 'bg-white text-red-500' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isSaved ? "Remover dos Meus Estudos" : "Salvar em Meus Estudos"}
                >
                    <Heart size={24} fill={isSaved ? "currentColor" : "none"} />
                </button>
              )}
           </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Inscrições</p>
                    <p className="font-semibold">{data.registrationPeriod}</p>
                </div>
            </div>
            <div className="p-4 flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <DollarSign size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Taxa</p>
                    <p className="font-semibold">{data.fee}</p>
                </div>
            </div>
            <div className="p-4 flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Data da Prova</p>
                    <p className="font-semibold">{data.examDate}</p>
                </div>
            </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Resumo da Carreira</h3>
          <p className="text-slate-600 leading-relaxed mb-6">{data.summary}</p>
          
          <div className="flex gap-4">
             <button 
              onClick={onStartSimulation}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <AlertCircle size={20} />
              Criar Simulado Agora
            </button>
          </div>
        </div>
      </div>

      {/* Accordion: Analysis vs Last Contest */}
      <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${isAnalysisOpen ? 'bg-white border-purple-200 shadow-md ring-1 ring-purple-100' : 'bg-purple-50/50 border-purple-100 hover:bg-purple-50'}`}>
        <button 
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
            className="w-full p-5 flex items-center justify-between group"
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isAnalysisOpen ? 'bg-purple-100 text-purple-700' : 'bg-white text-purple-400 group-hover:text-purple-600'}`}>
                    <Sparkles size={20} />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        Análise Estratégica
                        {!isAnalysisOpen && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Inteligência Artificial</span>}
                    </h3>
                    <p className="text-sm text-slate-500">Comparativo com último edital e tendências da banca</p>
                </div>
            </div>
            {isAnalysisOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </button>

        {isAnalysisOpen && (
             <div className="px-6 pb-6 pt-2 animate-slideDown">
                 <div className="h-px w-full bg-purple-100 mb-6"></div>
                 <div className="flex gap-4">
                     <div className="hidden sm:block w-1 bg-gradient-to-b from-purple-400 to-purple-200 rounded-full h-auto"></div>
                     <div className="flex-1">
                        <div className="prose prose-purple max-w-none text-slate-700">
                             <h4 className="flex items-center gap-2 font-bold text-purple-900 mb-3 text-lg">
                                 <History size={18} /> O que mudou?
                             </h4>
                             <p className="whitespace-pre-line leading-relaxed text-base">
                                {data.previousContestAnalysis}
                             </p>
                        </div>
                     </div>
                 </div>
             </div>
        )}
      </div>

      {/* Grid Layout for Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects - Main Focus */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          
          {isUpdatingRole && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center flex-col">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-indigo-700 font-semibold">Buscando edital para {data.selectedRole}...</p>
            </div>
          )}

          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                <GraduationCap size={20} />
            </span>
            Matérias {data.selectedRole ? `para ${data.selectedRole}` : 'Gerais'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
             {data.selectedRole 
                ? `Tópicos extraídos especificamente para o cargo de ${data.selectedRole}.`
                : "Selecione um cargo acima para ver os tópicos específicos do edital."}
          </p>
          
          <div className="space-y-6">
            {data.subjects.map((sub, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg text-slate-800">{sub.name}</span>
                  <div className="flex items-center gap-2">
                    {sub.questionCount && (
                         <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">{sub.questionCount}</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        sub.importance === 'Alta' ? 'bg-red-100 text-red-700' :
                        sub.importance === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        {sub.importance}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {sub.topics.map((topic, tIdx) => {
                        const isCompleted = data.completedTopics?.includes(topic);
                        return (
                            <div 
                                key={tIdx} 
                                className={`flex items-center gap-1 border rounded-lg px-3 py-1.5 transition-all text-sm group ${
                                    isCompleted 
                                    ? 'bg-green-50 border-green-200 text-green-700' 
                                    : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTopicCompletion && onToggleTopicCompletion(topic);
                                    }}
                                    className="mr-1 hover:scale-110 transition-transform"
                                    title={isCompleted ? "Marcar como não estudado" : "Marcar como estudado"}
                                >
                                    {isCompleted ? (
                                        <CheckCircle size={16} className="text-green-600" />
                                    ) : (
                                        <Circle size={16} className="text-slate-300 group-hover:text-indigo-300" />
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => onStudyTopic(sub.name, topic)}
                                    className="flex items-center gap-1.5 flex-1 text-left"
                                    title={`Gerar aula sobre ${topic}`}
                                >
                                    {topic}
                                </button>
                            </div>
                        );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Column */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm">🎯</span>
            Estratégia
          </h3>
          <div className="space-y-6">
            {data.strategies.map((strat, idx) => (
              <div key={idx} className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-green-500"></div>
                {idx !== data.strategies.length - 1 && (
                    <div className="absolute left-[4px] top-4 w-0.5 h-full bg-slate-200"></div>
                )}
                <h4 className="font-semibold text-slate-800 mb-1">{strat.phase}</h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-green-50/50 p-2 rounded-lg">{strat.advice}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Fontes da Pesquisa</h4>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => (
                    <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                        {source.title}
                        <ExternalLink size={10} />
                    </a>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ExamCard;
