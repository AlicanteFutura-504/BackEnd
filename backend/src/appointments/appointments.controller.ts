import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

/**
 * Controlador de Rutas para la gestión de Reservas.
 * Escucha las peticiones HTTP (GET, POST, PATCH, DELETE) que lleguen a la ruta '/appointments'.
 */
@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * GET /appointments
   * Obtiene la lista de todas las reservas almacenadas.
   */
  @Get()
  @ApiOkResponse({ description: 'Listado de reservas' })
  findAll() {
    return this.appointmentsService.findAll();
  }

  /**
   * GET /appointments/:id
   * Obtiene el detalle de una reserva mediante su identificador.
   * @param id El ID que viene en la URL de la petición.
   */
  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de una reserva' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOne(id);
  }

  /**
   * POST /appointments
   * Crea una nueva reserva en el sistema utilizando los datos del cuerpo (Body).
   * @param createAppointmentDto Objeto con los datos de la reserva, validado automáticamente por Nest.
   */
  @Post()
  @ApiCreatedResponse({ description: 'Reserva creada' })
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  /**
   * PATCH /appointments/:id
   * Actualiza parcialmente la información de una reserva (por ejemplo, cambiar su estado o la hora).
   * @param id El ID de la reserva a modificar, recibido de la URL.
   * @param updateAppointmentDto Objeto con los campos nuevos a aplicar.
   */
  @Patch(':id')
  @ApiOkResponse({ description: 'Reserva actualizada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  /**
   * DELETE /appointments/:id
   * Borra definitivamente una reserva de la base de datos usando su ID.
   * @param id El ID de la reserva a eliminar.
   */
  @Delete(':id')
  @ApiOkResponse({ description: 'Reserva eliminada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.remove(id);
  }
}