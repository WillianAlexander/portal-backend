import { Controller } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { AdminKeyGuard } from './guards/admin-key.guard';
import { UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/bootstrap')
export class BootstrapController {
  constructor(private readonly prisma: PrismaService) {}
}
