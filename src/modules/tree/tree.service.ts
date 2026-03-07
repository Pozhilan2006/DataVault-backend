import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface PropagationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable()
export class TreeService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async buildPropagationTree(fileId: string): Promise<PropagationGraph> {
    const client = this.supabaseService.getClient();

    // 1. Fetch all access_nodes for this file ordered by depth
    const { data: accessNodes, error } = await client
      .from('access_nodes')
      .select('*')
      .eq('file_id', fileId)
      .order('depth', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch access nodes: ${error.message}`);
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 2. Build graph nodes and edges
    for (const node of accessNodes) {
      // Build a human-readable label
      const label =
        node.depth === 0
          ? `Owner (depth 0)`
          : `${node.opened_by} (depth ${node.depth})`;

      nodes.push({
        id: node.id,
        label,
      });

      // 3. Create edge if parent exists
      if (node.parent_node_id) {
        edges.push({
          source: node.parent_node_id,
          target: node.id,
        });
      }
    }

    return { nodes, edges };
  }
}
