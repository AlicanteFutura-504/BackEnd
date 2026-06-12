import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { MailerService, BookingMailData } from '../mailer/mailer.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly mailerService: MailerService,
  ) {}

  async sendDualNotification(
    userId: number,
    data: BookingMailData,
    type: string,
    extras?: { bookingId?: number; reviewId?: number; link?: string }
  ) {
    // 1. Guardar en Base de Datos
    let title = 'Actualización de Reserva';
    let message = `Actualización de reserva en ${data.propertyName}.`;
    
    if (type === 'booking_created_host') {
      title = 'Nueva Solicitud de Reserva';
      message = `El huésped ha solicitado una reserva en ${data.propertyName}.`;
    } else if (data.status === 'confirmed') {
      title = 'Reserva Confirmada';
      message = `Tu reserva en ${data.propertyName} ha sido confirmada.`;
    } else if (data.status === 'cancelled') {
      title = 'Reserva Cancelada';
      message = `La reserva en ${data.propertyName} ha sido cancelada.`;
    }

    const notification = this.notificationRepo.create({
      userId,
      title,
      message,
      type,
      bookingId: extras?.bookingId,
      reviewId: extras?.reviewId,
      link: extras?.link,
    });
    await this.notificationRepo.save(notification);

    // 2. Enviar Email
    if (data.guestEmail) {
      await this.mailerService.sendBookingNotification(data);
    }
  }

  async findAllForUser(userId: number): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.notificationRepo.update({ id, userId }, { isRead: true });
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.notificationRepo.delete({ id, userId });
  }
}
