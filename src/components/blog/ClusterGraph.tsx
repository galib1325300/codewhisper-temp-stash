import React, { useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from '@/components/ui/badge';

interface BlogPost {
  id: string;
  title: string;
  status: string;
  is_pillar: boolean;
  content: string;
}

interface ClusterGraphProps {
  articles: BlogPost[];
  clusterName: string;
  missingCount: number;
}

export function ClusterGraph({ articles, clusterName, missingCount }: ClusterGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];

    // Central cluster node
    nodesList.push({
      id: 'cluster',
      data: { 
        label: (
          <div className="text-center px-4 py-2">
            <div className="font-bold text-sm">{clusterName}</div>
            <Badge variant="outline" className="mt-1 text-xs">Cluster</Badge>
          </div>
        )
      },
      position: { x: 400, y: 50 },
      type: 'input',
      style: {
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '8px',
        padding: '10px',
        width: 180,
      },
    });

    // Pillar article (if exists)
    const pillarArticle = articles.find(a => a.is_pillar);
    if (pillarArticle) {
      nodesList.push({
        id: pillarArticle.id,
        data: { 
          label: (
            <div className="text-center px-2 py-1">
              <div className="font-semibold text-xs mb-1 truncate max-w-[120px]">
                {pillarArticle.title}
              </div>
              <Badge variant="default" className="text-xs bg-purple-500">
                📌 Pilier
              </Badge>
            </div>
          )
        },
        position: { x: 400, y: 200 },
        style: {
          background: 'hsl(var(--card))',
          border: '3px solid #a855f7',
          borderRadius: '8px',
          padding: '8px',
          width: 140,
        },
      });

      edgesList.push({
        id: `cluster-${pillarArticle.id}`,
        source: 'cluster',
        target: pillarArticle.id,
        animated: true,
        style: { stroke: '#a855f7', strokeWidth: 3 },
      });
    }

    // Secondary articles
    const secondaryArticles = articles.filter(a => !a.is_pillar);
    const radius = 250;
    const angleStep = (2 * Math.PI) / Math.max(secondaryArticles.length, 1);

    secondaryArticles.forEach((article, index) => {
      const angle = index * angleStep;
      const x = 400 + radius * Math.cos(angle);
      const y = 350 + radius * Math.sin(angle);

      const getNodeColor = (status: string) => {
        switch (status) {
          case 'published': return { bg: '#10b981', border: '#059669' };
          case 'draft': return { bg: '#f59e0b', border: '#d97706' };
          default: return { bg: '#6b7280', border: '#4b5563' };
        }
      };

      const colors = getNodeColor(article.status);
      const hasLinks = article.content?.includes('<a href=') || false;

      nodesList.push({
        id: article.id,
        data: { 
          label: (
            <div className="text-center px-2 py-1">
              <div className="text-xs font-medium truncate max-w-[100px] mb-1">
                {article.title}
              </div>
              <div className="flex gap-1 justify-center">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: colors.bg + '20',
                    borderColor: colors.border,
                    color: colors.border
                  }}
                >
                  {article.status === 'published' ? 'Publié' : 'Brouillon'}
                </Badge>
                {hasLinks && (
                  <Badge variant="outline" className="text-xs">🔗</Badge>
                )}
              </div>
            </div>
          )
        },
        position: { x, y },
        style: {
          background: 'hsl(var(--card))',
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '6px',
          width: 120,
        },
      });

      // Connect to pillar or cluster
      if (pillarArticle) {
        edgesList.push({
          id: `${article.id}-pillar`,
          source: article.id,
          target: pillarArticle.id,
          animated: hasLinks,
          style: { 
            stroke: hasLinks ? colors.border : '#94a3b8',
            strokeWidth: hasLinks ? 2 : 1,
            strokeDasharray: hasLinks ? '0' : '5,5'
          },
        });
      } else {
        edgesList.push({
          id: `cluster-${article.id}`,
          source: 'cluster',
          target: article.id,
          style: { stroke: colors.border, strokeWidth: 1 },
        });
      }
    });

    // Missing articles nodes
    if (missingCount > 0) {
      const missingRadius = 350;
      const missingStart = secondaryArticles.length * angleStep;
      const missingAngleStep = (2 * Math.PI - missingStart) / missingCount;

      for (let i = 0; i < Math.min(missingCount, 5); i++) {
        const angle = missingStart + i * missingAngleStep;
        const x = 400 + missingRadius * Math.cos(angle);
        const y = 350 + missingRadius * Math.sin(angle);

        nodesList.push({
          id: `missing-${i}`,
          data: { 
            label: (
              <div className="text-center px-2 py-1">
                <div className="text-xs text-muted-foreground">À générer</div>
              </div>
            )
          },
          position: { x, y },
          style: {
            background: 'hsl(var(--muted))',
            border: '2px dashed hsl(var(--border))',
            borderRadius: '8px',
            padding: '6px',
            width: 100,
            opacity: 0.6,
          },
        });

        edgesList.push({
          id: `cluster-missing-${i}`,
          source: 'cluster',
          target: `missing-${i}`,
          style: { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5,5' },
        });
      }

      if (missingCount > 5) {
        nodesList.push({
          id: 'missing-more',
          data: { 
            label: (
              <div className="text-center px-2 py-1">
                <div className="text-xs text-muted-foreground">+{missingCount - 5} autres</div>
              </div>
            )
          },
          position: { x: 650, y: 500 },
          style: {
            background: 'hsl(var(--muted))',
            border: '2px dashed hsl(var(--border))',
            borderRadius: '8px',
            padding: '6px',
            width: 100,
            opacity: 0.5,
          },
        });
      }
    }

    return { nodes: nodesList, edges: edgesList };
  }, [articles, clusterName, missingCount]);

  return (
    <div style={{ height: '500px', width: '100%' }} className="bg-card rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.id === 'cluster') return 'hsl(var(--primary))';
            if (node.id.startsWith('missing')) return '#94a3b8';
            return '#10b981';
          }}
          style={{ background: 'hsl(var(--muted))' }}
        />
      </ReactFlow>
    </div>
  );
}
