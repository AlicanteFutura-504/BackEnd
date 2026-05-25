import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';

/**
 * Controlador de Rutas para la gestión de Pagos.
 * Escucha las peticiones HTTP (GET, POST, PATCH, DELETE) que lleguen a la ruta '/payments'.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  /**
   * GET /payments
   * Obtiene la lista de todos los pagos almacenados.
   */
  @Get()
  @ApiOkResponse({ description: 'Listado de pagos' })
  findAll(@Req() req: any) {
    return this.paymentsService.findAll(req.user);
  }

  /**
   * GET /payments/:id
   * Obtiene el detalle de una reserva mediante su identificador.
   * @param id El ID que viene en la URL de la petición.
   */
  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de una reserva' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  /**
   * POST /payments
   * Crea un nuevo pago en el sistema utilizando los datos del cuerpo (Body).
   * @param createPaymentDto Objeto con los datos del pago, validado automáticamente por Nest.
   */
  @Post()
  @ApiCreatedResponse({ description: 'Pago creado' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  /**
   * PATCH /payments/:id
   * Actualiza parcialmente la información de un pago (por ejemplo, cambiar su estado).
   * @param id El ID del pago a modificar, recibido de la URL.
   * @param updatePaymentDto Objeto con los campos nuevos a aplicar.
   */
  @Patch(':id')
  @ApiOkResponse({ description: 'Pago actualizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  /**
   * DELETE /payments/:id
   * Borra definitivamente un pago de la base de datos usando su ID.
   * @param id El ID del pago a eliminar.
   */
  @Delete(':id')
  @ApiOkResponse({ description: 'Pago eliminado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}