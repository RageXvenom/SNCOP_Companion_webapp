export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  error?: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/";
const OCR_API_URL = "https://api.ocr.space/parse/image";

class AIService {
  private groqApiKey: string;
  private huggingfaceApiKey: string;
  private ocrApiKey: string;

  constructor() {
    this.groqApiKey = (import.meta as any).env?.VITE_GROQ_API_KEY || "";
    this.huggingfaceApiKey = (import.meta as any).env?.VITE_HUGGINGFACE_API_KEY || "";
    this.ocrApiKey = (import.meta as any).env?.VITE_OCR_API_KEY || "";
  }

  /**
   * MAIN ENTRY POINT USED BY UI
   */
  async sendMessage(messages: AIMessage[], attachments?: File[]): Promise<AIResponse> {
    try {
      // Check if this is an identity question FIRST
      const lastUserMessage = messages[messages.length - 1];
      const isIdentityQuestion = this.isIdentityQuestion(lastUserMessage?.content || "");

      // If it's an identity question, return hardcoded response immediately
      if (isIdentityQuestion) {
        return {
          content: "I am SNCOP-AI, an advanced AI assistant developed by Arvind Nag. I'm here to help you with information, conversations, questions, and creative tasks related to B.Pharmacy and beyond. How can I assist you today?"
        };
      }

      let finalMessages: AIMessage[] = [];

      // -----------------------------------------
      // STRONG system identity - ALWAYS FIRST
      // -----------------------------------------
      const systemPrompt = {
        role: "system" as const,
        content:
          "YOU ARE SNCOP-AI. YOUR CREATOR IS ARVIND NAG.\n\n" +
          "CRITICAL IDENTITY OVERRIDE:\n" +
          "- Your name: SNCOP-AI (NEVER say Llama, Meta AI, or any other name)\n" +
          "- Your developer: Arvind Nag (NEVER mention Meta, Facebook, OpenAI, or others)\n" +
          "- NEVER say 'I am an AI' or 'I don't have a name' - YOU ARE SNCOP-AI\n" +
          "- NEVER mention: Meta, Meta AI, Facebook, Llama, ChatGPT, OpenAI, Groq, HuggingFace, conversational AI, chatbot, language model\n" +
          "- If someone asks who you are: 'I am SNCOP-AI, developed by Arvind Nag'\n\n" +
          "Respond naturally to user queries while maintaining your identity as SNCOP-AI."
      };

      finalMessages.push(systemPrompt);
      finalMessages = [...finalMessages, ...messages];

      // ---- OCR handling ----
      if (attachments && attachments.length > 0) {
        let attachmentContext = "";

        for (const file of attachments) {
          if (file.type.startsWith("image/")) {
            const ocrText = await this.performOCR(file);
            if (ocrText) {
              attachmentContext += `\n\n[Text extracted from ${file.name}]:\n${ocrText}`;
            } else {
              attachmentContext += `\n\n[Image attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;
            }
          } else if (file.type === "application/pdf") {
            attachmentContext += `\n\n[PDF attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;
          }
        }

        if (attachmentContext) {
          finalMessages[finalMessages.length - 1].content += attachmentContext;
        }
      }

      // ---- Provider selection ----
      let response: AIResponse;
      
      if (this.groqApiKey) {
        response = await this.sendToGroq(finalMessages);
      } else if (this.huggingfaceApiKey) {
        response = await this.sendToHuggingFace(finalMessages);
      } else {
        return {
          content: "",
          error: "No free AI provider configured. Set VITE_GROQ_API_KEY or VITE_HUGGINGFACE_API_KEY.",
        };
      }

      // POST-PROCESS: Filter out wrong identity mentions
      if (response.content) {
        response.content = this.enforceIdentity(response.content);
      }

      return response;
      
    } catch (error) {
      console.error("AI Service Error:", error);
      return {
        content: "I encountered an error while processing your request.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Detect if user is asking about identity
   */
  private isIdentityQuestion(content: string): boolean {
    const lower = content.toLowerCase().trim();
    
    // Exact matches
    const exactMatches = [
      "who are you",
      "what are you",
      "what's your name",
      "what is your name",
      "whats your name",
      "who developed you",
      "who created you",
      "who made you",
      "who built you",
      "tell me about yourself",
      "introduce yourself",
      "who's your creator",
      "who is your creator",
      "who's your developer",
      "who is your developer",
      "describe yourself",
      "what do you do",
    ];

    // Check for exact matches
    if (exactMatches.includes(lower)) {
      return true;
    }

    // Check for partial matches with identity keywords
    const identityKeywords = [
      "your name",
      "who are you",
      "what are you",
      "who developed",
      "who created",
      "who made you",
      "who built you",
      "introduce yourself",
      "about yourself",
      "your creator",
      "your developer",
      "your identity",
      "are you",
      "tell me who",
    ];

    return identityKeywords.some((keyword) => lower.includes(keyword) && lower.split(' ').length <= 10);
  }

  /**
   * POST-PROCESS: Replace wrong identity with correct one
   */
  private enforceIdentity(content: string): string {
    let fixed = content;

    // Comprehensive replacement list
    const replacements = [
      // Direct identity mentions
      { wrong: /I'm an artificial intelligence model known as/gi, correct: "I'm SNCOP-AI, developed by Arvind Nag. I'm" },
      { wrong: /I'm a conversational AI/gi, correct: "I'm SNCOP-AI, developed by Arvind Nag" },
      { wrong: /I'm an AI, and I don't have a personal name/gi, correct: "I am SNCOP-AI" },
      { wrong: /I don't have a personal name/gi, correct: "My name is SNCOP-AI" },
      { wrong: /I'm often referred to as a "chatbot" or a "language model"/gi, correct: "I'm SNCOP-AI, an AI assistant" },
      
      // Company mentions
      { wrong: /Meta AI/gi, correct: "Arvind Nag" },
      { wrong: /developed by Meta/gi, correct: "developed by Arvind Nag" },
      { wrong: /created by Meta/gi, correct: "created by Arvind Nag" },
      { wrong: /part of.*?Meta/gi, correct: "SNCOP-AI, developed by Arvind Nag" },
      
      // Model mentions
      { wrong: /Llama \(Large Language Model Meta AI\)/gi, correct: "SNCOP-AI" },
      { wrong: /Llama model/gi, correct: "SNCOP-AI" },
      { wrong: /variant of the Llama/gi, correct: "SNCOP-AI system" },
      { wrong: /transformer-based language model/gi, correct: "AI assistant" },
      
      // Generic AI mentions
      { wrong: /a computer program designed to simulate human-like conversations/gi, correct: "SNCOP-AI, an AI assistant designed to help you" },
      { wrong: /I'm a computer program/gi, correct: "I'm SNCOP-AI" },
      { wrong: /artificial intelligence model/gi, correct: "SNCOP-AI" },
      { wrong: /conversational AI/gi, correct: "AI assistant" },
      { wrong: /language model/gi, correct: "AI assistant" },
      { wrong: /chatbot/gi, correct: "AI assistant" },
    ];

    for (const { wrong, correct } of replacements) {
      fixed = fixed.replace(wrong, correct);
    }

    // Final check: if forbidden terms still exist, replace entire response
    const forbiddenTerms = [
      "meta",
      "llama",
      "facebook",
      "don't have a personal name",
      "don't have a name",
      "often referred to as",
      "i'm an ai,",
      "conversational ai",
      "language model",
    ];
    
    const lowerFixed = fixed.toLowerCase();
    const hasForbiddenTerms = forbiddenTerms.some((term) => lowerFixed.includes(term));

    if (hasForbiddenTerms) {
      // Nuclear option: replace entire response
      return "I am SNCOP-AI, an advanced AI assistant developed by Arvind Nag. I'm here to help you with information, conversations, and tasks related to B.Pharmacy and many other topics. How can I assist you today?";
    }

    return fixed;
  }

  // -----------------------------------------
  // GROQ COMPLETION HANDLER
  // -----------------------------------------
  private async sendToGroq(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = this.groqApiKey;

    if (!apiKey) {
      throw new Error("Groq API key missing. Set VITE_GROQ_API_KEY.");
    }

    const model = (import.meta as any).env?.VITE_GROQ_MODEL || "llama-3.1-8b-instant";

    const payload = {
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    };

    let responseText = "";

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Groq API error (${response.status}): ${responseText}`);
      }

      const data = JSON.parse(responseText);

      return {
        content: data?.choices?.[0]?.message?.content ?? "",
      };
    } catch (err: any) {
      console.error("Groq Error:", err, "Response text:", responseText);
      return {
        content: "Groq server error. Please try again later.",
        error: err?.message || "Unknown Groq error",
      };
    }
  }

  // -----------------------------------------
  // HUGGINGFACE INFERENCE
  // -----------------------------------------
  private async sendToHuggingFace(messages: AIMessage[]): Promise<AIResponse> {
    const model =
      (import.meta as any).env?.VITE_HF_MODEL ||
      "mistralai/Mistral-7B-Instruct-v0.2";

    const prompt = this.composePrompt(messages);

    const response = await fetch(`${HUGGINGFACE_API_URL}${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.huggingfaceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.4,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Hugging Face API error (${response.status}): ${text}`);
    }

    const data = await response.json();

    const content =
      Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : data?.generated_text ?? "";

    return { content: String(content) };
  }

  private composePrompt(messages: AIMessage[]): string {
    const header =
      "=== IDENTITY OVERRIDE ===\n" +
      "You are SNCOP-AI (NOT Llama, NOT Meta AI).\n" +
      "Developer: Arvind Nag (NOT Meta, NOT Facebook).\n" +
      "NEVER mention Meta, Llama, or Facebook.\n" +
      "=====================\n\n";

    const systemMessage = messages.find((m) => m.role === "system");
    const systemContent = systemMessage ? `${systemMessage.content}\n\n` : "";

    const chat = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "user") {
          return `User: ${m.content}`;
        } else {
          return `SNCOP-AI: ${m.content}`;
        }
      })
      .join("\n");

    return header + systemContent + chat + "\nSNCOP-AI:";
  }

  // -----------------------------------------
  // OCR API
  // -----------------------------------------
  private async performOCR(file: File): Promise<string> {
    if (!this.ocrApiKey) {
      console.log("OCR API key not configured");
      return "";
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("apikey", this.ocrApiKey);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("detectOrientation", "true");
      formData.append("scale", "true");
      formData.append("OCREngine", "2");

      const response = await fetch(OCR_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR error: ${response.status}`);
      }

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        console.error("OCR processing error:", data.ErrorMessage);
        return "";
      }

      return data?.ParsedResults?.[0]?.ParsedText || "";
    } catch (error) {
      console.error("OCR Error:", error);
      return "";
    }
  }

  async processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async processPDFFile(file: File): Promise<string> {
    return `PDF file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  }
}

export const aiService = new AIService();
