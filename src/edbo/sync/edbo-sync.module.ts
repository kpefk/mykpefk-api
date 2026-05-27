import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { PrismaModule } from '@/prisma/prisma.module'
import { EdboModule } from '@/edbo/core/edbo.module'

import { EdboSyncService } from './edbo-sync.service'
import { EdboSyncController } from './edbo-sync.controller'
import { UserModule } from '@/user/user.module'

@Module({
  imports: [
    PrismaModule,
    EdboModule,
    UserModule,
  ],
  controllers: [EdboSyncController],
  providers: [EdboSyncService],
  exports: [EdboSyncService],
})
export class EdboSyncModule {}