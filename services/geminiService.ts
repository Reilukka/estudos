
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExamData, Question, ExamAnalysisResult, StudyContent, Subject } from "../types";

// Models
const SEARCH_MODEL = 'gemini-2.5-flash'; 
const SIMULATION_MODEL = 'gemini-flash-lite-latest'; 

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      text: { type: Type.STRING, description: "The question stem" },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Exactly 5 options (A, B, C, D, E)"
      },
      correctOptionIndex: { type: Type.INTEGER, description: "0-based index of correct option" },
      explanation: { type: Type.STRING, description: "Detailed comment explaining why the answer is correct and others are wrong" },
      topic: { type: Type.STRING, description: "The specific topic this question covers" }
    },
    required: ["id", "text", "options", "correctOptionIndex", "explanation", "topic"]
  }
};

export const analyzeExam = async (examName: string): Promise<ExamAnalysisResult> => {
  try {
    const prompt = `
      Você é um especialista em concursos públicos de elite.
      Pesquise e analise detalhadamente o concurso: "${examName}".
      
      Se o concurso for específico (ex: "IBGE 2025"), busque os dados exatos do edital atual ou previsto.
      Se não houver edital aberto, baseie-se nas notícias mais recentes e no último edital.

      Preciso dos seguintes dados EXATOS:
      1. Banca Organizadora.
      2. CARGOS/VAGAS DISPONÍVEIS: Liste os principais cargos (ex: Técnico, Analista, Agente).
      3. Cronograma (Inscrição, Prova).
      4. Análise da Banca: Como ela costuma cobrar as questões?
      5. MATÉRIAS GERAIS: Liste as matérias comuns a todos os cargos ou do cargo principal.

      IMPORTANTE: Sua resposta deve ser APENAS um objeto JSON válido.
      Estrutura:
      {
        "title": "Nome oficial do concurso",
        "organization": "Nome da Banca",
        "estimatedVacancies": "Número de vagas",
        "registrationPeriod": "Ex: 15/01 a 20/02",
        "fee": "Ex: R$ 120,00",
        "examDate": "Ex: 12/05/2025",
        "summary": "Resumo geral do concurso e carreira",
        "previousContestAnalysis": "Texto detalhando diferenças para o último edital e estilo da banca.",
        "availableRoles": ["Cargo A", "Cargo B", "Cargo C"],
        "subjects": [
          {
            "name": "Nome da Matéria",
            "importance": "Alta" | "Média" | "Baixa",
            "topics": ["Tópico 1", "Tópico 2"],
            "questionCount": "Ex: 10 a 15 questões"
          }
        ],
        "strategies": [
          { "phase": "Nome da fase", "advice": "Conselho prático" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, 
      },
    });

    let jsonString = response.text || "";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedData: ExamData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from search result", jsonString);
      throw new Error("Não foi possível processar os dados do concurso. Tente novamente.");
    }

    const sources: { title: string; uri: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Fonte Web",
            uri: chunk.web.uri || "#"
          });
        }
      });
    }

    return {
      data: parsedData,
      sources: sources
    };

  } catch (error) {
    console.error("Erro ao analisar concurso:", error);
    throw error;
  }
};

export const getSubjectsForRole = async (
  examTitle: string,
  organization: string,
  role: string
): Promise<Subject[]> => {
  try {
    const prompt = `
      O usuário selecionou o cargo de "${role}" para o concurso "${examTitle}" (Banca: ${organization}).
      
      PESQUISE IMEDIATAMENTE o Edital (conteúdo programático) específico para ESTE CARGO.
      
      Retorne a lista de matérias e, principalmente, os TÓPICOS ESPECÍFICOS exigidos para ${role}.
      Não invente. Use dados reais do edital atual ou do último edital para este cargo.

      Estrutura JSON Array Obrigatória:
      [
          {
            "name": "Nome da Matéria",
            "importance": "Alta" | "Média" | "Baixa",
            "topics": ["Tópico Sub-item 1", "Tópico Sub-item 2"],
            "questionCount": "Estimativa"
          }
      ]
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    let jsonString = response.text || "";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(jsonString) as Subject[];

  } catch (error) {
    console.error("Erro ao buscar matérias do cargo:", error);
    throw new Error("Erro ao atualizar matérias para o cargo selecionado.");
  }
};

export const generateSimulation = async (
  examContext: string,
  count: number,
  topic: string = "Geral",
  studyContextContent: string = "",
  allSubjects?: Subject[],
  organization?: string // New parameter to force specific board style
): Promise<Question[]> => {
  try {
    let prompt = "";
    
    if (studyContextContent) {
        // 1. High precision mode based on specific study content
        prompt = `
          ATUE COMO UM EXAMINADOR DA BANCA DO CONCURSO: "${examContext}".
          
          Crie um SIMULADO DE ${count} QUESTÕES baseadas ESTRITAMENTE no texto de estudo abaixo.
          
          TEXTO DE ESTUDO (Base para as questões):
          """
          ${studyContextContent.substring(0, 50000)} ... (truncado se muito longo)
          """
          
          REGRAS RÍGIDAS:
          1. Nível: Médio/Difícil (Compatível com o concurso).
          2. Estilo: Imite a forma de cobrar da banca organizadora deste concurso.
          3. Crie questões que testem a compreensão das regras, exceções e jurisprudência citadas no texto.
          4. Gere 5 alternativas (A, B, C, D, E) por questão.
          5. COMENTÁRIO DETALHADO: No campo 'explanation', explique POR QUE a certa é certa e POR QUE as outras estão erradas, referenciando o texto.
          
          Retorne apenas o JSON array.
        `;
    } else if (topic === "Geral" && allSubjects && allSubjects.length > 0) {
        // 2. Full Mock Exam Mode (Prova Real) - LÓGICA APRIMORADA
        const subjectsList = allSubjects.map(s => `${s.name} (Peso: ${s.importance})`).join("; ");
        const orgContext = organization ? `BANCA ORGANIZADORA: ${organization}` : "Estilo da Banca Oficial";
        
        prompt = `
          ATENÇÃO MÁXIMA: Crie uma PROVA REAL (SIMULADO OFICIAL) para o concurso: "${examContext}".
          
          ${orgContext}.
          
          OBJETIVO: Simular EXATAMENTE a experiência de prova deste concurso.
          Quantidade Total de Questões: ${count}.
          
          MATÉRIAS DO EDITAL (Siga esta distribuição):
          ${subjectsList}
          
          DIRETRIZES RÍGIDAS DE CRIAÇÃO (PROVA REAL):
          1. PERSONA: Você é a banca ${organization || "Examinadora"}. Use o vocabulário, o tamanho dos textos e as pegadinhas típicas dessa banca.
          2. DISTRIBUIÇÃO: Distribua as ${count} questões proporcionalmente à importância ('Alta' deve ter mais questões).
          3. REALISMO: Não crie questões genéricas. Crie questões contextualizadas, citando leis, casos hipotéticos ou interpretação de texto, conforme o estilo da banca.
          4. FORMATO: Gere 5 alternativas (A-E) por questão.
          5. GABARITO: Comente cada questão detalhadamente, explicando a lógica da banca.
          
          Retorne apenas o JSON array.
        `;
    } else {
        // 3. Simple Topic or General Random Mode
        prompt = `Crie um simulado de questões inéditas para o concurso: "${examContext}".
        Foco do conteúdo: ${topic}.
        Quantidade de questões: ${count}.
        Estilo da banca: Imite o estilo da banca organizadora comum para este cargo.
        IMPORTANTE: Gere 5 alternativas por questão.
        Retorne apenas o JSON array.`;
    }

    const response = await ai.models.generateContent({
      model: SIMULATION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.7,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Question[];
    }
    throw new Error("Resposta vazia da IA ao gerar simulado");
  } catch (error) {
    console.error("Erro ao gerar simulado:", error);
    throw error;
  }
};

export const findPastExamQuestions = async (
    searchQuery: string
): Promise<{ questions: Question[], title: string, year: string, org: string }> => {
    try {
        const prompt = `
            Você é um Arquivista de Concursos Públicos.
            O usuário quer encontrar a PROVA REAL (Questões Históricas) com a seguinte busca: "${searchQuery}".
            
            1. PESQUISE NA WEB o conteúdo original desta prova específica (PDFs, sites de questões, gabaritos).
            2. Identifique o Ano e a Banca Organizadora exata.
            3. EXTRAIA ou RECONSTRUA o texto das questões REAIS. 
               - Tente encontrar pelo menos 20 a 30 questões originais.
               - Mantenha o enunciado fiel ao original.
               - Mantenha as alternativas originais.
               - Indique a alternativa correta baseada no gabarito oficial encontrado.
            
            Se não encontrar o texto exato de todas, encontre o máximo possível e complete com questões "estilo fiel" da mesma banca/ano/cargo para fechar o pacote, mas priorize as REAIS.
            
            IMPORTANTE: No campo 'explanation', adicione um comentário didático (Revisão) explicando a resposta, mesmo que a prova original não tivesse comentários.
            
            SAÍDA OBRIGATÓRIA:
            Responda APENAS com um objeto JSON válido, sem texto introdutório ou markdown.
            Estrutura:
            {
                "meta": { "title": "Titulo da Prova", "year": "Ano", "org": "Banca" },
                "questions": [
                    {
                        "id": "1",
                        "text": "Enunciado...",
                        "options": ["A", "B", "C", "D", "E"],
                        "correctOptionIndex": 0,
                        "explanation": "Comentário...",
                        "topic": "Assunto"
                    }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: SEARCH_MODEL,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Removed responseMimeType and responseSchema to allow tool use with JSON output instruction in prompt
                temperature: 0.1, 
            },
        });

        let jsonString = response.text || "";
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();

        let result;
        try {
             result = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON parse error for past exam", jsonString);
            throw new Error("Erro ao processar os dados da prova encontrada.");
        }

        if (!result.questions || result.questions.length === 0) {
            throw new Error("Não foi possível encontrar questões para esta prova.");
        }

        return {
            questions: result.questions,
            title: result.meta?.title || searchQuery,
            year: result.meta?.year || "Ano desconhecido",
            org: result.meta?.org || "Banca desconhecida"
        };

    } catch (error) {
        console.error("Erro ao buscar prova anterior:", error);
        throw error;
    }
};

export const generateStudyContent = async (
  examData: ExamData,
  subjectName: string,
  topicName: string
): Promise<StudyContent> => {
  try {
    const roleContext = examData.selectedRole ? `Cargo Foco: ${examData.selectedRole}` : "";

    const prompt = `
      ATUE COMO O MELHOR PROFESSOR DE CONCURSOS DO BRASIL (Especialista na banca ${examData.organization}).
      
      Sua missão é criar o material de estudo DEFINITIVO e PERFEITO para o tópico: "${topicName}" (${subjectName}).
      
      CONTEXTO RÍGIDO:
      - Concurso: ${examData.title}
      - Banca: ${examData.organization}
      - ${roleContext}
      - Pesquise questões anteriores dessa banca sobre esse assunto para moldar a explicação.

      ESTRUTURA OBRIGATÓRIA DA AULA (MARKDOWN AVANÇADO):

      # ${topicName}

      > **Visão Geral:** O que é isso e por que cai na prova da ${examData.organization}? (Seja direto).

      ## 1. A Mecânica da Regra (Teoria Pura)
      Não enrole. Explique COMO FUNCIONA.
      - Se for **Português**: Explique a regra gramatical exata, a lógica sintática. Mostre a estrutura da frase.
      - Se for **Direito**: Cite a Lei Seca (Artigos principais) e a Doutrina Majoritária.
      - Se for **Exatas**: Mostre a fórmula e o passo a passo lógico.

      ## 2. Regras de Ouro & Exceções (O que cai de verdade)
      Aqui é onde o aluno ganha a questão.
      - Liste as regras obrigatórias.
      - **:::ATENÇÃO:::**: Crie um bloco explicando as EXCEÇÕES. A banca ama exceções. Explique cada uma.
      - Use tabelas comparativas se ajudar a diferenciar conceitos (ex: Diferença entre X e Y).

      ## 3. Raio-X da Banca ${examData.organization}
      Use o Google Search para encontrar padrões.
      - "A ${examData.organization} costuma trocar a palavra A pela palavra B..."
      - "Neste tópico, a banca foca mais na lei seca ou na jurisprudência?"
      - Cite "pegadinhas" históricas desse assunto.

      ## 4. Exemplos Práticos Comentados
      Dê 3 exemplos claros.
      **:::EXEMPLO:::**:
      Cenário: [Situação]
      Aplicação: [Como a regra se aplica aqui]

      ## 5. Resumo para Memorizar (Flashcards)
      - Lista curta (bullet points) com palavras-chave que devem ser decoradas.

      ---
      Fim da aula.
      
      TOM DE VOZ:
      - Autoritário mas didático.
      - Use formatação rica: **Negrito** para termos chaves.
      - Seja PRECISO. Não use explicações genéricas. Use a terminologia técnica correta exigida no edital.
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL, 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.25, // Precision is key
      },
    });

    if (!response.text) {
      throw new Error("Não foi possível gerar o conteúdo de estudo.");
    }

    return {
      subject: subjectName,
      title: topicName,
      content: response.text
    };

  } catch (error) {
    console.error("Erro ao gerar material de estudo:", error);
    throw error;
  }
};

export const expandStudyContent = async (
  currentContent: string,
  examData: ExamData,
  topicName: string
): Promise<string> => {
  try {
    const prompt = `
      VOCÊ É O PROFESSOR DO CURSO AVANÇADO.
      
      O aluno já leu o material básico abaixo sobre "${topicName}".
      Agora ele clicou em "MAIS CONTEÚDO" para se aprofundar.
      
      MATERIAL JÁ EXISTENTE (Não repita isso):
      """
      ${currentContent.substring(currentContent.length - 2000)} ...
      """

      SUA MISSÃO - CRIE UM "APÊNDICE AVANÇADO":
      1. Pesquise nuances mais profundas, jurisprudências recentes ou detalhes técnicos que o material anterior não cobriu.
      2. Adicione 2 questões "Nível Hard" comentadas passo a passo.
      3. Use a formatação Markdown compatível.
      
      Comece o texto com: 
      "--- \n # Aprofundamento Avançado & Questões Extras"
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    return response.text || "";

  } catch (error) {
    console.error("Erro ao expandir conteúdo:", error);
    throw new Error("Não foi possível expandir o conteúdo.");
  }
};

export const askStudyTutor = async (
  currentContent: string,
  userQuestion: string
): Promise<string> => {
  try {
    const prompt = `
      Você é um Professor Particular Gentil e Extremamente Didático.
      O aluno está lendo um material sobre um tópico de concurso e tem uma dúvida específica.
      
      CONTEXTO DO MATERIAL ESTUDADO:
      """
      ${currentContent.substring(0, 3000)}... (trecho)
      """

      DÚVIDA DO ALUNO:
      "${userQuestion}"

      SUA MISSÃO:
      1. Explique a dúvida do aluno de forma clara, usando analogias do dia a dia.
      2. Dê um exemplo prático novo (diferente do material).
      3. Seja direto e encorajador.
      4. Use Markdown para formatar a resposta (Negrito para destaque).
    `;

    const response = await ai.models.generateContent({
      model: SIMULATION_MODEL, 
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text || "Desculpe, não consegui processar sua dúvida agora.";
  } catch (error) {
    console.error("Erro no tutor:", error);
    return "Ocorreu um erro ao consultar o tutor. Tente novamente.";
  }
};

export const generateStepByStepExplanation = async (
    topicName: string,
    currentContent: string
): Promise<string> => {
    try {
        const prompt = `
            ATUE COMO UM "PROFESSOR AVANÇADO" DE ELITE (Mentoria Individual).
            
            O aluno está estudando: "${topicName}".
            Ele pediu uma explicação "PASSO A PASSO" para entender a LÓGICA por trás desse assunto, como se fosse um algoritmo ou uma receita de bolo.
            
            Conteúdo Base (Contexto):
            "${currentContent.substring(0, 2000)}..."

            SUA MISSÃO - DESCONSTRUIR O TÓPICO EM ETAPAS LÓGICAS:
            
            Gere uma explicação estruturada exatamente assim:

            # 🧠 Lógica Estrutural: ${topicName}

            ## 1. O Conceito em 1 Frase
            Explique o que é isso sem "juridiquês" ou termos difíceis. Use uma analogia poderosa.

            ## 2. O Algoritmo de Identificação (Como saber que é isso?)
            Crie um Checklist Mental.
            "Para identificar se você deve usar essa regra, olhe para:"
            1. [Passo 1]
            2. [Passo 2]
            3. [Passo 3]

            ## 3. Manual de Aplicação (Passo a Passo)
            Como resolver uma questão desse tipo?
            - **Passo 1:** Faça X.
            - **Passo 2:** Verifique Y.
            - **Passo 3:** Aplique Z.

            ## 4. Exemplos "Dissecados"
            Dê 2 exemplos complexos, mas explique cada parte da frase/problema.
            Ex: "Na frase 'Vende-se casas'..."
            -> Passo 1: Identifique a partícula 'se'.
            -> Passo 2: O verbo é transitivo direto? Sim.
            -> Passo 3: Então é voz passiva. 'Casas' é sujeito.
            -> Conclusão: O verbo deve ir para o plural -> 'Vendem-se casas'.

            Use Markdown rico (Negrito, Listas). Seja extremamente didático e lógico.
        `;

        const response = await ai.models.generateContent({
            model: SIMULATION_MODEL, // Fast model is fine for logic breakdown
            contents: prompt,
            config: {
                temperature: 0.4,
            },
        });

        return response.text || "Não foi possível gerar a explicação avançada.";
    } catch (error) {
        console.error("Erro no professor avançado:", error);
        throw error;
    }
};
