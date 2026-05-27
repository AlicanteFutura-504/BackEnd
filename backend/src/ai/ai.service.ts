import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ChatRequestDto, ChatMessage } from './dto/chat-request.dto';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-flash-latest';

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsService: BookingsService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn('GEMINI_API_KEY no está configurada en .env. El Chatbot fallará.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  async getChatResponse(dto: ChatRequestDto, user: any): Promise<{ reply: string }> {
    try {
      const systemInstruction = `Eres el Asistente Virtual Oficial de Alicante Futura.
Tu objetivo es ayudar de forma amable y profesional a los empresarios y empresas que usan nuestra plataforma.

Información del usuario actual (extraída del sistema):
- ID del Usuario: ${user?.userId}
- Rol: ${user?.role || 'Desconocido'}
- Username: ${user?.username || 'Desconocido'}

Si el usuario te pregunta por sus reservas, citas o bookings, utiliza la herramienta (function) que tienes disponible para consultar la base de datos real y dale una respuesta formateada en base a lo que obtengas. Si la lista está vacía, dile que no tiene reservas.
Responde siempre en español, de manera clara, concisa y usando formato Markdown si es necesario. No reveles detalles internos del código.`;

      // Definición de la herramienta que la IA puede usar
      const getBookingsDeclaration: FunctionDeclaration = {
        name: 'get_user_bookings',
        description: 'Obtiene la lista real de reservas (bookings) o citas de la base de datos para el negocio del usuario actual.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}, // No params required since we use the authenticated user
        },
      };

      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [getBookingsDeclaration] }]
      });

      // Convert history to Gemini format
      const history = (dto.history || []).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Initialize chat session
      const chat = model.startChat({
        history,
      });

      // Enviar el mensaje inicial del usuario
      let result = await chat.sendMessage([{ text: dto.prompt }]);
      let response = await result.response;

      // Interceptar si Gemini decide llamar a la función
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        
        if (call.name === 'get_user_bookings') {
          // Consultar la base de datos real inyectando el usuario actual
          const bookings = await this.bookingsService.findAll(user);
          
          // Devolverle los datos a Gemini para que termine de redactar la respuesta
          result = await chat.sendMessage([{
            functionResponse: {
              name: 'get_user_bookings',
              response: { 
                bookings: bookings 
              }
            }
          }]);
          response = await result.response;
        }
      }
      
      return {
        reply: response.text() || 'Lo siento, no pude procesar tu respuesta.'
      };
    } catch (error) {
      console.error('Error al comunicarse con Gemini:', error);
      throw new InternalServerErrorException('Error al generar la respuesta de la IA. Comprueba que GEMINI_API_KEY es válida.');
    }
  }
}
