// src/users/dto/update-user.dto.ts
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'NuevoPassword123!' })
  @IsString()
  @IsOptional()
  password_hash?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
