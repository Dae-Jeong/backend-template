import { Body, Controller, Headers, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBody, ApiCreatedResponse, ApiHeader } from '@nestjs/swagger';
import { ReservationsService } from '../services/reservations.service.js';
import {
  ReserveRequestDto,
  IdempotencyKeyDto,
} from '../dto/reservations.request.dto.js';
import { ReservationResponseDto } from '../dto/reservations.response.dto.js';
import { inputPipe } from '../http/validation.js';
import { ApiProblems } from '../http/openapi.js';

@Controller('/v1/reservations')
@ApiProblems(409, 503)
export class ReservationsController {
  constructor(
    @Inject(ReservationsService)
    private readonly reservations: ReservationsService,
  ) {}
  @Post()
  @ApiBody({ type: ReserveRequestDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      pattern: '^[A-Za-z0-9._:-]+$',
    },
  })
  @ApiCreatedResponse({
    type: ReservationResponseDto,
    headers: {
      'Idempotency-Replayed': {
        schema: { type: 'string', enum: ['true', 'false'] },
      },
    },
  })
  async reserve(
    @Body(inputPipe(ReserveRequestDto, 'body', ['product_id']))
    body: ReserveRequestDto,
    @Headers('idempotency-key') key: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReservationResponseDto> {
    const headers = (await inputPipe(IdempotencyKeyDto, 'header', [
      'Idempotency-Key',
    ]).transform(
      { 'Idempotency-Key': key },
      { type: 'body' },
    )) as IdempotencyKeyDto;
    const { reservation, replayed } = await this.reservations.reserve(
      body.product_id,
      headers['Idempotency-Key'],
    );
    response.setHeader('Idempotency-Replayed', String(replayed));
    return {
      data: {
        reservation_id: reservation.reservationId,
        product_id: reservation.productId,
        created_at: reservation.createdAt.toISOString(),
      },
    };
  }
}
