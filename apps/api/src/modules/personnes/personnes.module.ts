import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { PersonnesController } from './personnes.controller';
import { PersonnesService } from './personnes.service';

@Module({
  imports: [CrmModule],
  controllers: [PersonnesController],
  providers: [PersonnesService],
})
export class PersonnesModule {}
