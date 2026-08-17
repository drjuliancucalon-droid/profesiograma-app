import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { renderProfesiogramaPdf } from '../services/pdf.service';
import { audit } from '../lib/audit';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

app.get('/profesiogramas/:id/pdf', requireAuth, async c => {
  const { id } = c.req.param();
  const actor = c.get('user') as any;

  const base = await c.env.DB.prepare(`
    SELECT p.id, p.fecha_emision, p.version,
           e.nombre as empresa_nombre, e.nit, e.responsable_sg_sst,
           pr.nombre as profesional_nombre, pr.licencia as profesional_licencia
    FROM profesiogramas p
    JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN profesionales pr ON pr.id = p.profesional_id
    WHERE p.id = ?1 LIMIT 1
  `).bind(id).first<any>();

  if (!base) return c.json({ success: false, error: 'Profesiograma no encontrado' }, 404);

  const { results: cargos } = await c.env.DB.prepare(`
    SELECT grupo_ocupacional, cargo, perfil_descripcion, peligros_riesgos,
           matriz_json, recomendaciones_json
    FROM cargos WHERE profesiograma_id = ?1
    ORDER BY orden_index ASC, creado_en ASC
  `).bind(id).all<any>();

  const pdfBytes = await renderProfesiogramaPdf(c.env, { ...base, cargos });

  await audit(c.env, {
    userId: actor.sub, action: 'pdf.export', entityType: 'profesiograma', entityId: id
  });

  const slug = (base.empresa_nombre as string).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="profesiograma-${slug}-v${base.version}.pdf"`,
    },
  });
});

export default app;
