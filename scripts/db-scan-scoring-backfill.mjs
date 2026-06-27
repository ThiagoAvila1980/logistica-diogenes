#!/usr/bin/env node
/**
 * Varre o banco e calcula pontuação retroativa a partir de serviços já concluídos.
 * Opcionalmente popula work_events (--apply).
 *
 * Regras (mesmas do sistema em produção):
 * - corte_vao: cuttingProgress.corte = true → cortador ativo
 * - transporte_vao: transportProgress.vidros = true → driverId do vão
 * - instalacao_vao: installationProgress.acabamento = true → installerId do vão
 * - medicao: status = 'medida' → assignedUserId da OS
 */
import pg from "pg";

const APPLY = process.argv.includes("--apply");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

function fmt(n) {
  return n.toLocaleString("pt-BR");
}

await client.connect();

try {
  // Regras de pontuação
  const { rows: rules } = await client.query(`
    SELECT event_type, points, active FROM scoring_rules ORDER BY event_type
  `);
  const pointsByType = Object.fromEntries(
    rules.filter((r) => r.active).map((r) => [r.event_type, Number(r.points)]),
  );

  console.log("\n=== Regras de pontuação (ativas) ===");
  for (const r of rules) {
    console.log(`  ${r.event_type}: ${r.points} pts ${r.active ? "" : "(inativa)"}`);
  }

  // Cortador ativo
  const { rows: cutters } = await client.query(`
    SELECT id, name FROM users
    WHERE active = true AND 'cortador' = ANY(roles)
    LIMIT 1
  `);
  const cortadorId = cutters[0]?.id ?? null;
  const cortadorName = cutters[0]?.name ?? "(nenhum cortador ativo)";

  // Usuários para nomes
  const { rows: allUsers } = await client.query(
    `SELECT id, name, roles FROM users WHERE active = true`,
  );
  const userName = new Map(allUsers.map((u) => [u.id, u.name]));

  // Medições com items
  const { rows: measurements } = await client.query(`
    SELECT id, number, status, assigned_user_id, items, updated_at
    FROM measurements
    WHERE items IS NOT NULL AND jsonb_array_length(items) > 0
  `);

  const events = [];
  let skippedNoUser = 0;

  for (const m of measurements) {
    const items = m.items ?? [];

    // Medição concluída (por OS)
    if (m.status === "medida" && m.assigned_user_id) {
      events.push({
        userId: m.assigned_user_id,
        measurementId: m.id,
        osNumber: m.number,
        itemId: "__os__",
        eventType: "medicao",
        points: pointsByType.medicao ?? 0,
        createdAt: m.updated_at,
      });
    } else if (m.status === "medida" && !m.assigned_user_id) {
      skippedNoUser++;
    }

    for (const item of items) {
      const itemId = item.id;
      if (!itemId) continue;

      const cut = item.cuttingProgress ?? {};
      const trans = item.transportProgress ?? {};
      const inst = item.installationProgress ?? {};

      if (cut.corte && cortadorId) {
        events.push({
          userId: cortadorId,
          measurementId: m.id,
          osNumber: m.number,
          itemId,
          eventType: "corte_vao",
          points: pointsByType.corte_vao ?? 0,
          createdAt: m.updated_at,
        });
      } else if (cut.corte && !cortadorId) {
        skippedNoUser++;
      }

      if (trans.vidros && trans.driverId) {
        events.push({
          userId: trans.driverId,
          measurementId: m.id,
          osNumber: m.number,
          itemId,
          eventType: "transporte_vao",
          points: pointsByType.transporte_vao ?? 0,
          createdAt: m.updated_at,
        });
      } else if (trans.vidros && !trans.driverId) {
        skippedNoUser++;
      }

      if (inst.acabamento && inst.installerId) {
        events.push({
          userId: inst.installerId,
          measurementId: m.id,
          osNumber: m.number,
          itemId,
          eventType: "instalacao_vao",
          points: pointsByType.instalacao_vao ?? 0,
          createdAt: m.updated_at,
        });
      } else if (inst.acabamento && !inst.installerId) {
        skippedNoUser++;
      }
    }
  }

  // Deduplica (measurement_id, item_id, event_type)
  const seen = new Set();
  const uniqueEvents = events.filter((e) => {
    const key = `${e.measurementId}|${e.itemId}|${e.eventType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return e.points > 0;
  });

  // Totais por tipo
  const byType = {};
  for (const e of uniqueEvents) {
    byType[e.eventType] = (byType[e.eventType] ?? { count: 0, points: 0 });
    byType[e.eventType].count++;
    byType[e.eventType].points += e.points;
  }

  // Totais por usuário
  const byUser = new Map();
  for (const e of uniqueEvents) {
    if (!byUser.has(e.userId)) {
      byUser.set(e.userId, {
        name: userName.get(e.userId) ?? e.userId,
        total: 0,
        corte_vao: 0,
        transporte_vao: 0,
        instalacao_vao: 0,
        medicao: 0,
        counts: { corte_vao: 0, transporte_vao: 0, instalacao_vao: 0, medicao: 0 },
      });
    }
    const u = byUser.get(e.userId);
    u.total += e.points;
    u[e.eventType] += e.points;
    u.counts[e.eventType]++;
  }

  const grandTotal = uniqueEvents.reduce((s, e) => s + e.points, 0);

  // work_events existentes
  const { rows: existingStats } = await client.query(`
    SELECT COUNT(*)::int AS cnt, COALESCE(SUM(points), 0)::int AS pts FROM work_events
  `);
  const existingCount = existingStats[0]?.cnt ?? 0;
  const existingPts = existingStats[0]?.pts ?? 0;

  console.log("\n=== Varredura de serviços concluídos ===");
  console.log(`  OS analisadas: ${measurements.length}`);
  console.log(`  Cortador creditado: ${cortadorName}`);
  console.log(`  Eventos elegíveis: ${uniqueEvents.length}`);
  if (skippedNoUser > 0) {
    console.log(`  Ignorados (sem responsável): ${skippedNoUser}`);
  }

  console.log("\n=== Pontuação por tipo ===");
  const typeLabels = {
    corte_vao: "Corte de vão",
    transporte_vao: "Transporte de vão",
    instalacao_vao: "Instalação de vão",
    medicao: "Medição",
  };
  for (const [type, label] of Object.entries(typeLabels)) {
    const t = byType[type] ?? { count: 0, points: 0 };
    console.log(`  ${label}: ${t.count} evento(s) → ${fmt(t.points)} pts`);
  }
  console.log(`  TOTAL: ${fmt(grandTotal)} pts`);

  console.log("\n=== Ranking por colaborador ===");
  const ranked = [...byUser.values()].sort((a, b) => b.total - a.total);
  if (ranked.length === 0) {
    console.log("  (nenhum evento elegível encontrado)");
  } else {
    let rank = 1;
    for (const u of ranked) {
      const parts = [];
      if (u.counts.corte_vao) parts.push(`${u.counts.corte_vao} corte(s)`);
      if (u.counts.transporte_vao) parts.push(`${u.counts.transporte_vao} transp.`);
      if (u.counts.instalacao_vao) parts.push(`${u.counts.instalacao_vao} inst.`);
      if (u.counts.medicao) parts.push(`${u.counts.medicao} med.`);
      console.log(
        `  ${rank}. ${u.name}: ${fmt(u.total)} pts (${parts.join(", ") || "—"})`,
      );
      rank++;
    }
  }

  console.log("\n=== work_events (tabela atual) ===");
  console.log(`  Registros: ${existingCount} | Soma: ${fmt(existingPts)} pts`);

  if (APPLY && uniqueEvents.length > 0) {
    console.log("\n=== Aplicando backfill em work_events ===");
    let inserted = 0;
    for (const e of uniqueEvents) {
      const res = await client.query(
        `
        INSERT INTO work_events (user_id, measurement_id, item_id, event_type, points, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (measurement_id, item_id, event_type) DO NOTHING
        RETURNING id
        `,
        [e.userId, e.measurementId, e.itemId, e.eventType, e.points, e.createdAt],
      );
      if (res.rowCount > 0) inserted++;
    }
    const { rows: afterStats } = await client.query(`
      SELECT COUNT(*)::int AS cnt, COALESCE(SUM(points), 0)::int AS pts FROM work_events
    `);
    console.log(`  Inseridos agora: ${inserted}`);
    console.log(
      `  Total na tabela: ${afterStats[0].cnt} registros | ${fmt(afterStats[0].pts)} pts`,
    );
  } else if (!APPLY && uniqueEvents.length > existingCount) {
    console.log(
      "\n💡 Para gravar no banco: node --env-file=.env.local scripts/db-scan-scoring-backfill.mjs --apply",
    );
  }
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
