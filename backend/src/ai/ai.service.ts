import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ChatRequestDto, ChatMessage } from './dto/chat-request.dto';
import { BookingsService } from '../bookings/bookings.service';
import { CustomersService } from '../customers/customers.service';
import { BusinessService } from '../business/business.service';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-flash-latest';

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsService: BookingsService,
    private readonly customersService: CustomersService,
    private readonly businessService: BusinessService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn('GEMINI_API_KEY no está configurada en .env. El Chatbot fallará.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  async getChatResponse(dto: ChatRequestDto, user: any): Promise<{ reply: string }> {
    try {
      // Fetch available businesses for the user to provide context to Gemini
      const userBusinesses = await this.businessService.findAll(user.userId, user.role, user.username);
      const businessListString = userBusinesses.length > 0 
        ? userBusinesses.map(b => `- ID: ${b.id}, Nombre: ${b.nombre}`).join('\n')
        : 'Ninguna (no tiene negocios)';

      const systemInstruction = `Eres el Asistente Virtual Oficial de Alicante Futura.
Tu objetivo es ayudar de forma amable y profesional a los empresarios y empresas que usan nuestra plataforma.

Información del usuario actual (extraída del sistema):
- ID del Usuario: ${user?.userId}
- Rol: ${user?.role || 'Desconocido'}
- Username: ${user?.username || 'Desconocido'}
- Sus empresas asociadas:
${businessListString}

Si el usuario te pregunta por sus reservas, citas o bookings, utiliza la herramienta (function) que tienes disponible para consultar la base de datos real y dale una respuesta formateada en base a lo que obtengas. Si la lista está vacía, dile que no tiene reservas.
Si el usuario te pide crear o añadir un nuevo cliente, utiliza la herramienta (function) 'create_customer'. Pídele los datos faltantes si es necesario (se necesita nombre, email, y opcionalmente teléfono). 
MUY IMPORTANTE: Si el usuario tiene varias empresas asociadas (míralas arriba) y no ha especificado en cuál de ellas quiere crear al cliente, DEBES preguntarle en qué empresa quiere registrarlo antes de usar la herramienta. Si especifica el nombre de la empresa, busca el ID correspondiente en la lista de arriba y pásalo como 'businessId' a la herramienta. Si solo tiene 1 empresa o si ya te dijo el nombre, usa esa.
Responde siempre en español, de manera clara, concisa y usando formato Markdown si es necesario. No reveles detalles internos del código.`;

      // Herramienta 1: Leer Reservas
      const getBookingsDeclaration: FunctionDeclaration = {
        name: 'get_user_bookings',
        description: 'Obtiene la lista real de reservas (bookings) o citas de la base de datos para el negocio del usuario actual.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}, 
        },
      };

      // Herramienta 2: Crear Cliente
      const createCustomerDeclaration: FunctionDeclaration = {
        name: 'create_customer',
        description: 'Añade un nuevo cliente a la base de datos. Requiere nombre, correo electrónico y opcionalmente businessId.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Nombre del cliente' },
            email: { type: SchemaType.STRING, description: 'Correo electrónico del cliente' },
            phone: { type: SchemaType.STRING, description: 'Número de teléfono (opcional)' },
            businessId: { type: SchemaType.NUMBER, description: 'El ID de la empresa en la que se guarda. (Obligatorio si tiene más de 1 empresa)' },
          },
          required: ['name', 'email']
        },
      };

      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [getBookingsDeclaration, createCustomerDeclaration] }]
      });

      const history = (dto.history || []).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });

      let result = await chat.sendMessage([{ text: dto.prompt }]);
      let response = await result.response;

      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        
        if (call.name === 'get_user_bookings') {
          const bookings = await this.bookingsService.findAll(user);
          result = await chat.sendMessage([{
            functionResponse: {
              name: 'get_user_bookings',
              response: { bookings: bookings }
            }
          }]);
          response = await result.response;
        } 
        else if (call.name === 'create_customer') {
          const { name, email, phone, businessId } = call.args as any;
          
          try {
            // Logica de asignación de negocio
            // Si el LLM pasó un businessId, lo usamos.
            // Si no lo pasó, pero el usuario tiene solo 1 empresa (o es empleado con un businessId fijo), lo usamos.
            // Si no hay de dónde sacarlo, queda undefined.
            let finalBusinessId = businessId;
            if (!finalBusinessId) {
               if (user?.businessId) {
                  finalBusinessId = user.businessId;
               } else if (userBusinesses.length > 0) {
                  finalBusinessId = userBusinesses[0].id; // Fallback al primero
               }
            }

            // Intentar crear al cliente
            const newCustomer = await this.customersService.create({
              name,
              email,
              phone,
              businessId: finalBusinessId
            });

            result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_customer',
                response: { success: true, customer: newCustomer, message: "Cliente creado exitosamente en la BBDD" }
              }
            }]);
          } catch (e: any) {
             result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_customer',
                response: { success: false, error: e.message || "Error desconocido al crear cliente" }
              }
            }]);
          }
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
