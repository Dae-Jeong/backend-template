import { Controller, Get, Inject, Query } from '@nestjs/common';
import { GreetingsService } from '../services/greetings.service.js';
import { GreetingRequestDto } from '../dto/greetings.request.dto.js';
import {
  GreetingResponseDto,
  MessageResponseDto,
} from '../dto/greetings.response.dto.js';
import { inputPipe } from '../http/validation.js';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ApiProblems } from '../http/openapi.js';

@Controller()
@ApiProblems()
export class GreetingsController {
  constructor(
    @Inject(GreetingsService) private readonly greetings: GreetingsService,
  ) {}
  @Get('/')
  @ApiOkResponse({ type: MessageResponseDto })
  index(): MessageResponseDto {
    return { data: { message: 'Hello, NestJS!' } };
  }
  @Get('/v1/greetings')
  @ApiQuery({
    name: 'name',
    required: true,
    schema: { type: 'string', minLength: 1, maxLength: 80 },
  })
  @ApiOkResponse({ type: GreetingResponseDto })
  greet(
    @Query(inputPipe(GreetingRequestDto, 'query')) query: GreetingRequestDto,
  ): GreetingResponseDto {
    const result = this.greetings.greet(query.name);
    return {
      data: {
        message: result.message,
        generated_at: result.generatedAt.toISOString(),
      },
    };
  }
}
