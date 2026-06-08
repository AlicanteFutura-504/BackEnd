import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Interfaz para los datos del correo de reserva.
 */
export interface BookingMailData {
  guestEmail: string;
  guestName: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'pending' | 'confirmed' | 'modified' | 'cancelled';
}

/**
 * Servicio encargado de gestionar el envío de correos mediante SMTP usando Nodemailer.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros
      auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
      },
    });
  }

  /**
   * Genera el HTML para el correo basado en el estado de la reserva.
   */
  private generateHtmlTemplate(data: BookingMailData): string {
    const { guestName, propertyName, checkInDate, checkOutDate, status } = data;
    let title = '';
    let message = '';
    let color = '';

    switch (status) {
      case 'confirmed':
        title = '¡Reserva Confirmada!';
        message = `¡Buenas noticias, ${guestName}! Tu reserva en <strong>${propertyName}</strong> ha sido confirmada con éxito.`;
        color = '#28a745';
        break;
      case 'modified':
        title = 'Actualización de tu Reserva';
        message = `Hola ${guestName}, ha habido un cambio en los detalles de tu reserva en <strong>${propertyName}</strong>.`;
        color = '#ffc107';
        break;
      case 'cancelled':
        title = 'Reserva Cancelada';
        message = `Hola ${guestName}, lamentamos informarte que tu reserva en <strong>${propertyName}</strong> ha sido cancelada.`;
        color = '#dc3545';
        break;
      case 'pending':
      default:
        title = 'Reserva Pendiente de Confirmación';
        message = `Hola ${guestName}, hemos recibido tu solicitud de reserva en <strong>${propertyName}</strong>. Pronto te confirmaremos.`;
        color = '#17a2b8';
        break;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${title}</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px;">${message}</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="margin-top: 0;">Detalles de la Estancia</h3>
            <p><strong>Alojamiento:</strong> ${propertyName}</p>
            <p><strong>Fecha de Check-in:</strong> ${checkInDate}</p>
            <p><strong>Fecha de Check-out:</strong> ${checkOutDate}</p>
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Gracias por usar Alicante Futura.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Envía una notificación de estado de reserva al huésped.
   * @param data Objeto con los datos de la reserva para el envío
   */
  async sendBookingNotification(data: BookingMailData): Promise<void> {
    try {
      const html = this.generateHtmlTemplate(data);
      const subject = `Alicante Futura - ${data.status === 'confirmed' ? 'Reserva Confirmada' : data.status === 'cancelled' ? 'Reserva Cancelada' : 'Actualización de Reserva'}`;

      const info = await this.transporter.sendMail({
        from: `"Alicante Futura" <${process.env.SMTP_USER || 'noreply@alicantefutura.com'}>`,
        to: data.guestEmail,
        subject,
        html,
      });

      this.logger.log(`Email enviado: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Error enviando el email de notificación', error);
    }
  }
}
