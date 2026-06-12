import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message } from './message.entity';
import { BookingEntity as Booking, BookingStatus } from '../bookings/booking.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async sendMessage(senderId: number, receiverId: number, content: string, bookingId?: number) {
    // Verificar que existe una reserva activa/confirmada/terminada entre ellos
    const validStatuses = [BookingStatus.CONFIRMED, BookingStatus.TERMINADA, BookingStatus.MODIFIED];
    
    // Buscar si hay reserva válida donde sender es huésped y receiver es anfitrión (o viceversa)
    const bookings = await this.bookingRepository.find({
      where: [
        { usuarioId: senderId, property: { usuarioId: receiverId }, status: In(validStatuses) },
        { usuarioId: receiverId, property: { usuarioId: senderId }, status: In(validStatuses) }
      ],
      relations: ['property']
    });

    if (bookings.length === 0 && senderId !== receiverId) {
      // Allow self-messaging or admins to bypass? Let's be strict:
      // Only allow if there's a booking.
      // Wait, what if receiver is ADMIN? For simplicity, we strictly require a booking.
      throw new ForbiddenException('Solo puedes enviar mensajes si hay una reserva confirmada o terminada entre vosotros.');
    }

    const assignedBookingId = bookingId || (bookings.length > 0 ? bookings[0].id : undefined);

    const message = this.messageRepository.create({
      senderId,
      receiverId,
      content,
      bookingId: assignedBookingId
    });

    return this.messageRepository.save(message);
  }

  async getMessagesBetween(userId: number, otherUserId: number) {
    return this.messageRepository.find({
      where: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      order: { createdAt: 'ASC' },
      relations: ['sender', 'receiver']
    });
  }

  async getConversations(userId: number) {
    // Get latest message for each conversation
    const messages = await this.messageRepository.find({
      where: [
        { senderId: userId },
        { receiverId: userId }
      ],
      order: { createdAt: 'DESC' },
      relations: ['sender', 'receiver']
    });

    const conversationsMap = new Map<number, any>();
    
    messages.forEach(msg => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          otherUserId,
          otherUser: {
            id: otherUser.id,
            nombreCompleto: otherUser.nombreCompleto,
            username: otherUser.username,
            profilePicture: otherUser.profilePicture,
            role: otherUser.role
          },
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0
        });
      } else {
        if (msg.receiverId === userId && !msg.isRead) {
          conversationsMap.get(otherUserId).unreadCount += 1;
        }
      }
    });

    return Array.from(conversationsMap.values());
  }

  async markAsRead(userId: number, senderId: number) {
    await this.messageRepository.update(
      { receiverId: userId, senderId, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
