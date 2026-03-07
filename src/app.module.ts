import { Module } from '@nestjs/common';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { ShareModule } from './modules/share/share.module';
import { AccessModule } from './modules/access/access.module';
import { TreeModule } from './modules/tree/tree.module';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    FilesModule,
    ShareModule,
    AccessModule,
    TreeModule,
  ],
})
export class AppModule {}
