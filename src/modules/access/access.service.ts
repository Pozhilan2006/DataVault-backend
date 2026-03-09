import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class AccessService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAccessNodesForFile(fileId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('access_nodes')
      .select('*')
      .eq('file_id', fileId)
      .order('depth', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch access nodes: ${error.message}`);
    }

    return data ?? [];
  }

  async createAccessNode(params: {
    fileId: string;
    parentNodeId: string | null;
    openedByUserId: string;
    openedByUsername: string;
    depth: number;
  }) {
    const client = this.supabaseService.getClient();
    const { v4: uuidv4 } = await import('uuid');

    const { data, error } = await client
      .from('access_nodes')
      .insert({
        id: uuidv4(),
        file_id: params.fileId,
        parent_node_id: params.parentNodeId,
        opened_by_user_id: params.openedByUserId,
        opened_by_username: params.openedByUsername,
        opened_at: new Date().toISOString(),
        depth: params.depth,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create access node: ${error.message}`);
    }

    return data;
  }
}
