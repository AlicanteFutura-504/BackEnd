import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ChatRequestDto, ChatMessage } from './dto/chat-request.dto';
import { BookingsService } from '../bookings/bookings.service';
import { CustomersService } from '../customers/customers.service';
import { BusinessService } from '../business/business.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-flash-latest';

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsService: BookingsService,
    private readonly customersService: CustomersService,
    private readonly businessService: BusinessService,
    private readonly paymentsService: PaymentsService
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

      const systemInstruction = `Eres el Asistente Virtual Oficial de Yoku.
Tu objetivo es ayudar de forma amable y profesional a los empresarios y empresas que usan nuestra plataforma.

Información del usuario actual (extraída del sistema):
- ID del Usuario: ${user?.userId}
- Rol: ${user?.role || 'Desconocido'}
- Username: ${user?.username || 'Desconocido'}
- Sus empresas asociadas:
${businessListString}

Si el usuario te pregunta por sus reservas, citas o bookings, utiliza la herramienta (function) que tienes disponible para consultar la base de datos real y dale una respuesta formateada en base a lo que obtengas. Si la lista está vacía, dile que no tiene reservas.
Si el usuario te pide crear o hacer una nueva reserva (booking/cita), utiliza la herramienta (function) 'create_booking'. Pídele todos los datos necesarios: nombre y apellidos del cliente, correo electrónico, teléfono, fecha (día), hora y el servicio que desea.
Si el usuario te pide crear o añadir un nuevo cliente, utiliza la herramienta (function) 'create_customer'. Pídele los datos faltantes si es necesario (se necesita nombre, email, y opcionalmente teléfono). 
MUY IMPORTANTE: Si el usuario tiene varias empresas asociadas (míralas arriba) y no ha especificado en cuál de ellas quiere realizar la acción (reserva o crear cliente), DEBES preguntarle en qué empresa quiere registrarlo antes de usar la herramienta. Si especifica el nombre de la empresa, busca el ID correspondiente en la lista de arriba y pásalo como 'businessId' a la herramienta. Si solo tiene 1 empresa o si ya te dijo el nombre, usa esa.
Si el usuario te pide crear o registrar un pago, utiliza la herramienta (function) 'create_payment'. Asegúrate de pedirle todos los datos necesarios: nombre del cliente, importe a pagar, fecha, método de pago (tarjeta, efectivo, bizum, transferencia, pendiente) y estado (pagado o pendiente).
Si el usuario te pide crear una empresa o negocio, utiliza la herramienta (function) 'create_business'. Asegúrate de pedirle todos los datos necesarios: nombre del local, ubicación (direccion), teléfono de contacto, usuario de la cuenta (username), correo electrónico y contraseña.
Responde siempre en español, de manera clara, concisa y usando formato Markdown si es necesario. No reveles detalles internos del código.

REGLA ESTRICTA DE COMPORTAMIENTO:
Únicamente puedes contestar y asistir en temas relacionados con la plataforma Yoku (gestión de citas, clientes, empresas, etc.). Si el usuario te pregunta o te pide cualquier otra cosa que sea ajena al programa (información general, programación, matemáticas, redactar textos que no sean para la plataforma, etc.), DEBES NEGARTE CORTÉSMENTE a responder. Dile que eres un asistente exclusivo de Yoku y que no estás programado para responder cuestiones externas a la aplicación.`;

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

      // Herramienta 3: Crear Empresa (Solo Admins)
      const createBusinessDeclaration: FunctionDeclaration = {
        name: 'create_business',
        description: 'Crea una nueva empresa/negocio y su cuenta de usuario. Requiere nombre, direccion, telefono, username, email y contrasena. Solo puede ser ejecutada por administradores.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            nombre: { type: SchemaType.STRING, description: 'Nombre de la empresa o local' },
            direccion: { type: SchemaType.STRING, description: 'Ubicación o dirección de la empresa' },
            telefono: { type: SchemaType.STRING, description: 'Teléfono de contacto' },
            username: { type: SchemaType.STRING, description: 'Nombre de usuario para la cuenta de la empresa' },
            email: { type: SchemaType.STRING, description: 'Correo electrónico de la cuenta' },
            contrasena: { type: SchemaType.STRING, description: 'Contraseña de la cuenta' },
          },
          required: ['nombre', 'direccion', 'telefono', 'username', 'email', 'contrasena']
        },
      };

      // Herramienta 4: Crear Reserva
      const createBookingDeclaration: FunctionDeclaration = {
        name: 'create_booking',
        description: 'Crea una nueva reserva o cita. Requiere datos del cliente (nombre, apellido, email, teléfono) y de la cita (fecha, hora, servicio).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            customerName: { type: SchemaType.STRING, description: 'Nombre del cliente' },
            customerSurname: { type: SchemaType.STRING, description: 'Apellido(s) del cliente' },
            customerEmail: { type: SchemaType.STRING, description: 'Correo electrónico del cliente' },
            customerPhone: { type: SchemaType.STRING, description: 'Teléfono del cliente' },
            date: { type: SchemaType.STRING, description: 'Fecha de la reserva en formato YYYY-MM-DD' },
            time: { type: SchemaType.STRING, description: 'Hora de la reserva (ej. 10:00)' },
            service: { type: SchemaType.STRING, description: 'Servicio que desea reservar' },
            businessId: { type: SchemaType.NUMBER, description: 'ID de la empresa' },
          },
          required: ['customerName', 'customerSurname', 'customerEmail', 'customerPhone', 'date', 'time', 'service']
        }
      };

      // Herramienta 5: Crear Pago
      const createPaymentDeclaration: FunctionDeclaration = {
        name: 'create_payment',
        description: 'Crea o registra un nuevo pago. Requiere nombre del cliente, importe, fecha, método de pago y estado.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: { type: SchemaType.STRING, description: 'Nombre completo del cliente' },
            amount: { type: SchemaType.NUMBER, description: 'Importe o cantidad a pagar' },
            date: { type: SchemaType.STRING, description: 'Fecha del pago en formato YYYY-MM-DD' },
            type: { type: SchemaType.STRING, description: 'Método de pago. Valores válidos: tarjeta, efectivo, bizum, transferencia, pendiente' },
            status: { type: SchemaType.STRING, description: 'Estado del pago. Valores válidos: pagado, pendiente' },
            businessId: { type: SchemaType.NUMBER, description: 'ID de la empresa' },
          },
          required: ['clientName', 'amount', 'date', 'type', 'status']
        }
      };

      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [getBookingsDeclaration, createCustomerDeclaration, createBusinessDeclaration, createBookingDeclaration, createPaymentDeclaration] }]
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
        else if (call.name === 'create_business') {
          if (user.role !== 'admin' && user.role !== 'ADMIN' && user.username !== 'root') {
             result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_business',
                response: { success: false, error: "Permiso denegado. Solo los usuarios con rol de empresario (ADMIN) pueden crear empresas." }
              }
            }]);
          } else {
            const { nombre, direccion, telefono, username, email, contrasena } = call.args as any;
            try {
              const newBusiness = await this.businessService.crearEmpresa({
                nombre,
                direccion,
                telefono,
                username,
                email,
                contrasena,
                usuarioId: user.userId
              });
              result = await chat.sendMessage([{
                functionResponse: {
                  name: 'create_business',
                  response: { success: true, business: newBusiness, message: "Empresa creada exitosamente en la BBDD" }
                }
              }]);
            } catch (e: any) {
              result = await chat.sendMessage([{
                functionResponse: {
                  name: 'create_business',
                  response: { success: false, error: e.message || "Error al crear la empresa" }
                }
              }]);
            }
          }
          response = await result.response;
        }
        else if (call.name === 'create_booking') {
          const { customerName, customerSurname, customerEmail, customerPhone, date, time, service, businessId } = call.args as any;
          try {
            let finalBusinessId = businessId;
            if (!finalBusinessId) {
               if (user?.businessId) {
                  finalBusinessId = user.businessId;
               } else if (userBusinesses.length > 0) {
                  finalBusinessId = userBusinesses[0].id;
               }
            }
            
            // Comprobar si el cliente ya existe
            let customer = await this.customersService.findByEmail(customerEmail);
            if (!customer) {
               customer = await this.customersService.create({
                 name: customerName,
                 surname: customerSurname,
                 email: customerEmail,
                 phone: customerPhone,
                 businessId: finalBusinessId
               });
            }

            const newBooking = await this.bookingsService.create({
              date,
              time,
              status: 'pending',
              customerId: customer.id,
              businessId: finalBusinessId,
              serviceName: service
            });

            result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_booking',
                response: { success: true, booking: newBooking, message: "Reserva creada exitosamente" }
              }
            }]);
          } catch (e: any) {
            result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_booking',
                response: { success: false, error: e.message || "Error al crear la reserva" }
              }
            }]);
          }
          response = await result.response;
        }
        else if (call.name === 'create_payment') {
          const { clientName, amount, date, type, status, businessId } = call.args as any;
          try {
            let finalBusinessId = businessId;
            if (!finalBusinessId) {
               if (user?.businessId) {
                  finalBusinessId = user.businessId;
               } else if (userBusinesses.length > 0) {
                  finalBusinessId = userBusinesses[0].id;
               }
            }

            const businessName = userBusinesses.find(b => b.id === finalBusinessId)?.nombre || 'Empresa Desconocida';

            const newPayment = await this.paymentsService.create({
              clientName,
              amount: parseFloat(amount),
              date,
              type,
              status,
              businessName,
              businessId: finalBusinessId
            });

            result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_payment',
                response: { success: true, payment: newPayment, message: "Pago registrado exitosamente" }
              }
            }]);
          } catch (e: any) {
            result = await chat.sendMessage([{
              functionResponse: {
                name: 'create_payment',
                response: { success: false, error: e.message || "Error al registrar el pago" }
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
