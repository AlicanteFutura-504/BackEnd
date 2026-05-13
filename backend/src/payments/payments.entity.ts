import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Enumeración que define los estados posibles en los que puede encontrarse una reserva.
 */
export enum PaymentType {
  CARD = 'tarjeta',     // Tarjeta
  CASH = 'efectivo', // Efectivo
  BIZUM = 'bizum',           // Bizum
  TRANSFER = 'transferencia', // Transferencia
  PENDING = 'pendiente', // Pendiente
}

export enum PaymentStatus {
  PAID = 'pagado',           // El cliente ha pagado el servicio
  PENDING = 'pendiente',     // Pendiente de confirmación o de que llegue la fecha
}


/**
 * Entidad 'Payment'.
 * Esta clase representa la tabla 'payment' dentro de la base de datos SQLite.
 * Cada instancia de esta clase será una fila de la tabla (un registro).
 */
@Entity()
export class Payment {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Estado actual del pago */
  @Column({
    type: 'text',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /** Tipo de pago */
  @Column({
    type: 'text',
    default: PaymentType.CARD,
  })
  type: PaymentType;

  /** Nombre del cliente que realiza el pago. */
  @Column()
  clientName: string;

  /** Nombre de la empresa o local en el que se ejecuta el pago. */
  @Column()
  businessName: string;


  /** Importe del pago. */
  @Column()
  amount: number;

}