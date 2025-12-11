
import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, RotateCcw, Save } from 'lucide-react';
import { Question, UserAnswer, SimulationResult } from '../types';

interface SimulationRunnerProps {
  simulationId: string;
  questions: Question[];
  initialAnswers?: UserAnswer[];
  onFinish: (result: SimulationResult) => void;
  onUpdate: (result: SimulationResult) => void; // For real-time saving
  topicContext?: string;
  examTitle: string;
}

const SimulationRunner: React.FC<SimulationRunnerProps> = ({ 
  simulationId, 
  questions, 
  initialAnswers = [], 
  onFinish, 
  onUpdate,
  topicContext,
  examTitle
}) => {
  // Initialize state based on previously saved answers if any
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Jump to the first unanswered question
    const answeredIds = new Set(initialAnswers.map(a => a.questionId));
    const firstUnanswered = questions.findIndex(q => !answeredIds.has(q.id));
    return firstUnanswered !== -1 ? firstUnanswered : 0;
  });

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>(initialAnswers);
  const [score, setScore] = useState(() => initialAnswers.filter(a => a.isCorrect).length);
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = questions[currentIndex];

  // Check if current question was already answered in history (for resuming view)
  useEffect(() => {
    const existingAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);
    if (existingAnswer) {
      setSelectedOption(existingAnswer.selectedOptionIndex);
      setIsAnswered(true);
    } else {
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [currentIndex, currentQuestion, userAnswers]);

  const createCurrentResult = (finalStatus: 'IN_PROGRESS' | 'COMPLETED'): SimulationResult => {
      return {
          id: simulationId,
          examTitle: examTitle,
          date: new Date().toISOString(), // Update timestamp on save
          topic: topicContext || questions[0]?.topic || "Geral",
          score: score,
          totalQuestions: questions.length,
          questions: questions,
          userAnswers: userAnswers,
          status: finalStatus
      };
  };

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleConfirm = () => {
    if (selectedOption === null) return;
    
    setIsAnswered(true);
    
    const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    const answer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedOptionIndex: selectedOption,
        isCorrect: isCorrect
    };
    
    const updatedAnswers = [...userAnswers, answer];
    setUserAnswers(updatedAnswers);

    // REAL-TIME SAVE
    const intermediateResult: SimulationResult = {
        id: simulationId,
        examTitle: examTitle,
        date: new Date().toISOString(),
        topic: topicContext || "Geral",
        score: newScore,
        totalQuestions: questions.length,
        questions: questions,
        userAnswers: updatedAnswers,
        status: 'IN_PROGRESS'
    };
    onUpdate(intermediateResult);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishSimulation();
    }
  };

  const finishSimulation = () => {
      setShowSummary(true);
      const result = createCurrentResult('COMPLETED');
      onFinish(result); // Final save
  };

  const handleExit = () => {
      // Just save state and exit, don't mark as completed if not done
      const result = createCurrentResult(userAnswers.length === questions.length ? 'COMPLETED' : 'IN_PROGRESS');
      onFinish(result);
  };

  const progress = useMemo(() => {
    return ((currentIndex + 1) / questions.length) * 100;
  }, [currentIndex, questions.length]);

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center animate-fadeIn mt-10">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🏆</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Simulado Finalizado!</h2>
        <p className="text-slate-600 mb-8">O resultado foi salvo no seu histórico.</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="text-sm text-slate-500 mb-1">Total</div>
            <div className="text-2xl font-bold text-slate-800">{questions.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-sm text-green-600 mb-1">Acertos</div>
            <div className="text-2xl font-bold text-green-700">{score}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl">
            <div className="text-sm text-indigo-600 mb-1">Aproveitamento</div>
            <div className="text-2xl font-bold text-indigo-700">{percentage}%</div>
          </div>
        </div>

        <button 
          onClick={handleExit}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          <RotateCcw size={20} />
          Voltar aos Estudos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-10">
      {/* Header / Progress */}
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-slate-500">
        <button onClick={handleExit} className="flex items-center hover:text-indigo-600 transition-colors">
            <ArrowRight className="rotate-180 mr-1" size={16} /> Salvar e Sair
        </button>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            {topicContext === 'Geral' ? 'Simulado Geral' : topicContext}
        </span>
      </div>
      
      <div className="w-full h-3 bg-slate-200 rounded-full mb-8 overflow-hidden relative">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute top-0 right-0 h-full flex items-center pr-2">
           <span className="text-[9px] font-bold text-slate-500 mix-blend-multiply">{currentIndex + 1}/{questions.length}</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <p className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed mb-8">
            {currentQuestion.text}
          </p>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = currentQuestion.correctOptionIndex === idx;
              
              let baseClasses = "w-full text-left p-4 rounded-xl border-2 transition-all relative ";
              
              if (isAnswered) {
                if (isCorrect) {
                  baseClasses += "border-green-500 bg-green-50 text-green-900";
                } else if (isSelected && !isCorrect) {
                  baseClasses += "border-red-500 bg-red-50 text-red-900";
                } else {
                  baseClasses += "border-slate-100 text-slate-400 opacity-60";
                }
              } else {
                if (isSelected) {
                  baseClasses += "border-indigo-600 bg-indigo-50 text-indigo-900";
                } else {
                  baseClasses += "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                  className={baseClasses}
                >
                  <div className="flex items-start gap-3">
                    <span className={`
                      flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold
                      ${isAnswered && isCorrect ? 'border-green-600 bg-green-600 text-white' : 
                        isAnswered && isSelected && !isCorrect ? 'border-red-500 bg-red-500 text-white' : 
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-500'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isAnswered && isCorrect && <CheckCircle2 size={20} className="text-green-600" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle size={20} className="text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end items-center gap-4">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
             <Save size={12} /> Progresso salvo automaticamente
          </div>
          {!isAnswered ? (
            <button
              onClick={handleConfirm}
              disabled={selectedOption === null}
              className="px-6 py-2 bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
            >
              Confirmar Resposta
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {currentIndex < questions.length - 1 ? 'Próxima Questão' : 'Finalizar Simulado'} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      {isAnswered && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 animate-slideUp">
          <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
            <BookOpen size={20} />
            Comentário da Banca (IA)
          </div>
          <p className="text-blue-900 leading-relaxed">
            {currentQuestion.explanation}
          </p>
        </div>
      )}
    </div>
  );
};

export default SimulationRunner;
