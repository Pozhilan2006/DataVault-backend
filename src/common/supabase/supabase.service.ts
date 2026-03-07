import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {

  private client: SupabaseClient
  private bucket: string

  constructor(private configService: ConfigService) {

    const url = this.configService.get<string>('SUPABASE_URL')
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    this.bucket = this.configService.get<string>('SUPABASE_BUCKET')

    this.client = createClient(url, key)
  }

  getClient(): SupabaseClient {
    return this.client
  }

  async uploadFile(
    path: string,
    file: Buffer,
    mimetype: string,
    filename: string
  ) {

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: mimetype,
        upsert: false
      })

    if (error) throw error

    return data
  }

  getPublicUrl(bucket: string, path: string) {

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }
}