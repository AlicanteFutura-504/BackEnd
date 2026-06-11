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
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOkResponse({ description: 'Listado de pagos filtrado por acceso' })
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.paymentsService.findAll(
      req.user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || '',
      propertyId,
    );
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de un pago' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Pago creado' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Pago actualizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Req() req: any,
  ) {
    return this.paymentsService.update(id, updatePaymentDto, req.user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Pago eliminado' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.paymentsService.remove(id, req.user);
  }
}
