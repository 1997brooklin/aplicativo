import { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, Receipt, Package, CalendarCheck, BarChart3,
  Plus, Trash2, X, Check, Clock,
  AlertCircle, ChevronRight, Home,
  Banknote, Smartphone, HandCoins, FileText, Church
} from "lucide-react";

// ============================================================
// CHAVES DE ARMAZENAMENTO
// ============================================================
const K = {
  items: "conv:items",
  sales: "conv:sales",
  expenses: "conv:expenses",
  orders: "conv:orders",
  transfers: "conv:transfers",
};

// ============================================================
// HELPERS DE STORAGE
// ============================================================
const load = async (key, fallback = []) => {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
};
const save = async (key, value) => {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
};
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const brl = (v) => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ============================================================
// ESTILOS COMPARTILHADOS
// ============================================================
const styles = `
  :root {
    --bg: #faf8f5;
    --surface: #ffffff;
    --surface-2: #f4f1ec;
    --ink: #1a1a1a;
    --ink-soft: #5a5550;
    --ink-faint: #8a857f;
    --line: #e8e3dc;
    --accent: #6b4423;
    --accent-soft: #f0e6d8;
    --success: #2d6a4f;
    --success-soft: #d8e9df;
    --warn: #b45309;
    --warn-soft: #fef3c7;
    --danger: #991b1b;
    --danger-soft: #fde8e8;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body, .app-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--ink);
    background: var(--bg);
    margin: 0;
  }
  .app-root {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    padding-bottom: 84px;
    position: relative;
  }
  .display-font { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.01em; }
  .num-font { font-variant-numeric: tabular-nums; }
  .btn-press { transition: transform 120ms ease, background 150ms ease; }
  .btn-press:active { transform: scale(0.97); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
  .input { width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; font-size: 16px; background: var(--surface); color: var(--ink); font-family: inherit; }
  .input:focus { outline: none; border-color: var(--accent); }
  .label { font-size: 13px; color: var(--ink-soft); font-weight: 500; margin-bottom: 6px; display: block; }
  .scroll-hide::-webkit-scrollbar { display: none; }
  .scroll-hide { scrollbar-width: none; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-backdrop { animation: fadeIn 200ms ease; }
  .modal-sheet { animation: slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1); }
`;

// ============================================================
// MODAL / BOTTOM SHEET
// ============================================================
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed", inset: 0, background: "rgba(20,15,10,0.5)",
        zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, background: "var(--surface)",
          borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)"
        }}
      >
        <div style={{
          display: "flex", justifyContent: "center", padding: "10px 0 4px"
        }}>
          <div style={{ width: 40, height: 4, background: "var(--line)", borderRadius: 2 }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 20px 16px"
        }}>
          <h3 className="display-font" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="btn-press" style={{
            background: "var(--surface-2)", border: "none", borderRadius: 10,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "0 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: 14, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <div className="num-font display-font" style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: accent || "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ============================================================
// PAYMENT BADGE
// ============================================================
function PaymentBadge({ type }) {
  const config = {
    pix: { Icon: Smartphone, label: "Pix", color: "var(--success)", bg: "var(--success-soft)" },
    dinheiro: { Icon: Banknote, label: "Dinheiro", color: "var(--accent)", bg: "var(--accent-soft)" },
    outros: { Icon: HandCoins, label: "Outros", color: "var(--warn)", bg: "var(--warn-soft)" },
  }[type] || { Icon: HandCoins, label: type, color: "var(--ink-soft)", bg: "var(--surface-2)" };
  const Icon = config.Icon;
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
      background: config.bg, color: config.color, display: "flex", alignItems: "center", gap: 3,
      textTransform: "uppercase", letterSpacing: "0.05em"
    }}>
      <Icon size={10} /> {config.label}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ sales, expenses, orders, transfers, items, goTo }) {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthSales = sales.filter(s => s.date.startsWith(thisMonth));
    const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth));
    const monthTransfers = transfers.filter(t => t.date.startsWith(thisMonth));

    const revenue = monthSales.reduce((s, x) => s + x.total, 0);
    const cost = monthExpenses.reduce((s, x) => s + x.value, 0);
    const transferred = monthTransfers.reduce((s, x) => s + x.value, 0);
    const profit = revenue - cost;
    const balance = profit - transferred;

    const pendingOrders = orders.filter(o => o.status === "pendente").length;
    const lowStock = items.filter(i => i.stock !== null && i.stock !== undefined && i.stock <= 5).length;

    return { revenue, cost, profit, transferred, balance, pendingOrders, lowStock, salesCount: monthSales.length };
  }, [sales, expenses, orders, transfers, items]);

  const recentSales = sales.slice(-5).reverse();

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Conveniência</div>
        <h1 className="display-font" style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 600 }}>Caixa da Igreja</h1>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #6b4423 0%, #8b5a2b 100%)",
        borderRadius: 18, padding: 20, color: "#faf8f5", marginBottom: 16,
        boxShadow: "0 4px 20px rgba(107, 68, 35, 0.15)"
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          Lucro do mês
        </div>
        <div className="num-font display-font" style={{ fontSize: 36, fontWeight: 600, marginTop: 6 }}>
          {brl(stats.profit)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13, opacity: 0.92 }}>
          <div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Faturado</div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(stats.revenue)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Gasto</div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(stats.cost)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Vendas</div>
            <div className="num-font" style={{ fontWeight: 600 }}>{stats.salesCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard
          label="A repassar"
          value={brl(stats.balance > 0 ? stats.balance : 0)}
          sub="Lucro - repasses"
          accent="var(--success)"
        />
        <StatCard
          label="Já repassado"
          value={brl(stats.transferred)}
          sub="Neste mês"
        />
      </div>

      {(stats.pendingOrders > 0 || stats.lowStock > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {stats.pendingOrders > 0 && (
            <button onClick={() => goTo("orders")} className="btn-press" style={{
              flex: 1, padding: 12, background: "var(--warn-soft)", border: "1px solid #f5deb3",
              borderRadius: 12, textAlign: "left", cursor: "pointer"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="var(--warn)" />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)" }}>{stats.pendingOrders} encomenda(s)</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>pendentes</div>
            </button>
          )}
          {stats.lowStock > 0 && (
            <button onClick={() => goTo("items")} className="btn-press" style={{
              flex: 1, padding: 12, background: "var(--danger-soft)", border: "1px solid #f8c4c4",
              borderRadius: 12, textAlign: "left", cursor: "pointer"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} color="var(--danger)" />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>{stats.lowStock} item(s)</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>com estoque baixo</div>
            </button>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Últimas vendas</h3>
          <button onClick={() => goTo("sales")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}>
            Ver todas <ChevronRight size={14} />
          </button>
        </div>
        {recentSales.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--ink-faint)", fontSize: 13 }}>
            Nenhuma venda registrada ainda
          </div>
        ) : recentSales.map(s => (
          <div key={s.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid var(--line)"
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.service}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{fmtDate(s.date)} · {s.items.length} item(s)</div>
            </div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(s.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SALES SCREEN
// ============================================================
function SalesScreen({ sales, items, setSales, setItems }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const grouped = useMemo(() => {
    const map = {};
    [...sales].reverse().forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sales]);

  const handleSave = async (sale) => {
    let updated;
    if (editing) {
      updated = sales.map(s => s.id === sale.id ? sale : s);
    } else {
      updated = [...sales, { ...sale, id: uid() }];
      const itemsCopy = [...items];
      sale.items.forEach(si => {
        if (si.itemId) {
          const it = itemsCopy.find(x => x.id === si.itemId);
          if (it && it.stock !== null && it.stock !== undefined) {
            it.stock = Math.max(0, it.stock - si.qty);
          }
        }
      });
      setItems(itemsCopy);
      await save(K.items, itemsCopy);
    }
    setSales(updated);
    await save(K.sales, updated);
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta venda?")) return;
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    await save(K.sales, updated);
  };

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 className="display-font" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Vendas</h1>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-press" style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>
          <Plus size={16} /> Nova venda
        </button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <ShoppingBag size={32} color="var(--ink-faint)" style={{ marginBottom: 12 }} />
          <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Nenhuma venda registrada</div>
          <div style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 4 }}>Toque em "Nova venda" para começar</div>
        </div>
      )}

      {Object.entries(grouped).map(([date, daySales]) => {
        const dayTotal = daySales.reduce((s, x) => s + x.total, 0);
        return (
          <div key={date} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "0 4px 8px"
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {fmtDate(date)}
              </div>
              <div className="num-font" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                {brl(dayTotal)}
              </div>
            </div>
            {daySales.map(s => (
              <div key={s.id} className="card" style={{ padding: 14, marginBottom: 8, cursor: "pointer" }}
                onClick={() => { setEditing(s); setShowAdd(true); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                        background: "var(--accent-soft)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em"
                      }}>{s.service}</div>
                      <PaymentBadge type={s.payment} />
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                      {s.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
                    </div>
                    {s.fiadoNome && (
                      <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 3, fontWeight: 500 }}>
                        👤 {s.fiadoNome}{s.fiadoTel ? ` · ${s.fiadoTel}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num-font display-font" style={{ fontSize: 18, fontWeight: 600 }}>{brl(s.total)}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} style={{
                      background: "none", border: "none", color: "var(--ink-faint)", marginTop: 4, cursor: "pointer"
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <Sheet open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Editar venda" : "Nova venda"}>
        <SaleForm sale={editing} items={items} onSave={handleSave} />
      </Sheet>
    </div>
  );
}

function SaleForm({ sale, items, onSave }) {
  const [date, setDate] = useState(sale?.date || today());
  const [service, setService] = useState(sale?.service || "Domingo manhã");
  const [payment, setPayment] = useState(sale?.payment || "pix");
  const [saleItems, setSaleItems] = useState(sale?.items || []);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [fiadoNome, setFiadoNome] = useState(sale?.fiadoNome || "");
  const [fiadoTel, setFiadoTel] = useState(sale?.fiadoTel || "");

  const services = ["Domingo manhã", "Domingo noite", "Quarta", "Sexta", "Sábado", "Evento especial"];
  const total = saleItems.reduce((s, i) => s + (i.qty * i.price), 0);

  const addItemFromMenu = (item) => {
    const existing = saleItems.find(si => si.itemId === item.id);
    if (existing) {
      setSaleItems(saleItems.map(si => si.itemId === item.id ? { ...si, qty: si.qty + 1 } : si));
    } else {
      setSaleItems([...saleItems, { itemId: item.id, name: item.name, qty: 1, price: item.price }]);
    }
  };

  const addCustomItem = () => {
    if (!customName || !customPrice) return;
    setSaleItems([...saleItems, { itemId: null, name: customName, qty: 1, price: parseFloat(customPrice.replace(",", ".")) }]);
    setCustomName(""); setCustomPrice("");
  };

  const updateQty = (idx, delta) => {
    const copy = [...saleItems];
    copy[idx].qty = Math.max(0, copy[idx].qty + delta);
    setSaleItems(copy.filter(i => i.qty > 0));
  };

  const handleSubmit = () => {
    if (saleItems.length === 0) { alert("Adicione pelo menos 1 item"); return; }
    if (payment === "outros" && !fiadoNome) { alert("Informe o nome de quem ficou devendo"); return; }
    onSave({ id: sale?.id, date, service, payment, items: saleItems, total, fiadoNome: payment === "outros" ? fiadoNome : null, fiadoTel: payment === "outros" ? fiadoTel : null });
  };

  return (
    <div>
      <label className="label">Data</label>
      <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 14 }} />

      <label className="label">Culto / Evento</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }} className="scroll-hide">
        {services.map(s => (
          <button key={s} onClick={() => setService(s)} className="btn-press" style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid",
            borderColor: service === s ? "var(--accent)" : "var(--line)",
            background: service === s ? "var(--accent)" : "var(--surface)",
            color: service === s ? "#fff" : "var(--ink)",
            fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer"
          }}>{s}</button>
        ))}
      </div>

      <label className="label">Pagamento</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { v: "pix", l: "Pix", I: Smartphone },
          { v: "dinheiro", l: "Dinheiro", I: Banknote },
          { v: "outros", l: "Fiado/Outros", I: HandCoins },
        ].map(p => (
          <button key={p.v} onClick={() => setPayment(p.v)} className="btn-press" style={{
            flex: 1, padding: 10, borderRadius: 8, border: "1px solid",
            borderColor: payment === p.v ? "var(--accent)" : "var(--line)",
            background: payment === p.v ? "var(--accent-soft)" : "var(--surface)",
            color: payment === p.v ? "var(--accent)" : "var(--ink-soft)",
            fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer"
          }}>
            <p.I size={16} />
            {p.l}
          </button>
        ))}
      </div>

      {payment === "outros" && (
        <div style={{
          background: "var(--warn-soft)", border: "1px solid #f5deb3",
          borderRadius: 12, padding: 14, marginBottom: 14
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--warn)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <HandCoins size={14} /> Dados de quem vai pagar depois
          </div>
          <label className="label">Nome (obrigatório)</label>
          <input className="input" placeholder="Ex: Irmão João Silva" value={fiadoNome} onChange={e => setFiadoNome(e.target.value)} style={{ marginBottom: 10, background: "#fff" }} />
          <label className="label">Telefone (opcional)</label>
          <input className="input" placeholder="(61) 9 0000-0000" value={fiadoTel} onChange={e => setFiadoTel(e.target.value)} inputMode="tel" style={{ background: "#fff" }} />
        </div>
      )}

      <label className="label">Itens vendidos</label>
      {saleItems.length > 0 && (
        <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10, marginBottom: 12 }}>
          {saleItems.map((si, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 0"
            }}>
              <div style={{ flex: 1, fontSize: 14 }}>{si.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => updateQty(idx, -1)} className="btn-press" style={{
                  width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
                  background: "var(--surface)", cursor: "pointer", fontWeight: 600
                }}>−</button>
                <div className="num-font" style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{si.qty}</div>
                <button onClick={() => updateQty(idx, 1)} className="btn-press" style={{
                  width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
                  background: "var(--surface)", cursor: "pointer", fontWeight: 600
                }}>+</button>
                <div className="num-font" style={{ width: 70, textAlign: "right", fontWeight: 600, fontSize: 14 }}>
                  {brl(si.qty * si.price)}
                </div>
              </div>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", paddingTop: 8,
            marginTop: 4, borderTop: "1px solid var(--line)", fontWeight: 600
          }}>
            <div>Total</div>
            <div className="num-font display-font" style={{ fontSize: 18, color: "var(--accent)" }}>{brl(total)}</div>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>Do cardápio (toque para adicionar)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.map(it => (
              <button key={it.id} onClick={() => addItemFromMenu(it)} className="btn-press" style={{
                padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)",
                background: "var(--surface)", cursor: "pointer", fontSize: 13,
                display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2
              }}>
                <div style={{ fontWeight: 500 }}>{it.name}</div>
                <div className="num-font" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{brl(it.price)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>Item avulso</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="input" placeholder="Nome" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 2 }} />
          <input className="input" placeholder="R$" value={customPrice} onChange={e => setCustomPrice(e.target.value)} style={{ flex: 1 }} inputMode="decimal" />
          <button onClick={addCustomItem} className="btn-press" style={{
            padding: "0 14px", borderRadius: 10, border: "1px solid var(--accent)",
            background: "var(--accent-soft)", color: "var(--accent)", cursor: "pointer"
          }}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-press" style={{
        width: "100%", padding: 14, background: "var(--accent)", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
      }}>
        {sale ? "Salvar alterações" : `Registrar venda (${brl(total)})`}
      </button>
    </div>
  );
}

// ============================================================
// EXPENSES SCREEN
// ============================================================
function ExpensesScreen({ expenses, items, setExpenses }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = async (exp) => {
    const updated = editing
      ? expenses.map(e => e.id === exp.id ? exp : e)
      : [...expenses, { ...exp, id: uid() }];
    setExpenses(updated);
    await save(K.expenses, updated);
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este gasto?")) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await save(K.expenses, updated);
  };

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const totalMes = expenses
    .filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + e.value, 0);

  const categoryColors = {
    insumos: { bg: "var(--accent-soft)", color: "var(--accent)" },
    embalagem: { bg: "var(--success-soft)", color: "var(--success)" },
    equipamento: { bg: "var(--warn-soft)", color: "var(--warn)" },
    outros: { bg: "var(--surface-2)", color: "var(--ink-soft)" },
  };

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 className="display-font" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Gastos</h1>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-press" style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>
          <Plus size={16} /> Novo gasto
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          Total do mês
        </div>
        <div className="num-font display-font" style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>
          {brl(totalMes)}
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Receipt size={32} color="var(--ink-faint)" style={{ marginBottom: 12 }} />
          <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Nenhum gasto registrado</div>
        </div>
      )}

      {sorted.map(e => {
        const cat = categoryColors[e.category] || categoryColors.outros;
        const linked = items.find(i => i.id === e.linkedItemId);
        return (
          <div key={e.id} className="card" style={{ padding: 14, marginBottom: 8, cursor: "pointer" }}
            onClick={() => { setEditing(e); setShowAdd(true); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: cat.bg, color: cat.color, textTransform: "uppercase", letterSpacing: "0.05em"
                  }}>{e.category}</div>
                  {linked && (
                    <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                      → {linked.name}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{e.desc}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{fmtDate(e.date)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num-font display-font" style={{ fontSize: 18, fontWeight: 600, color: "var(--danger)" }}>
                  −{brl(e.value)}
                </div>
                <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} style={{
                  background: "none", border: "none", color: "var(--ink-faint)", marginTop: 4, cursor: "pointer"
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <Sheet open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Editar gasto" : "Novo gasto"}>
        <ExpenseForm expense={editing} items={items} onSave={handleSave} />
      </Sheet>
    </div>
  );
}

function ExpenseForm({ expense, items, onSave }) {
  const [date, setDate] = useState(expense?.date || today());
  const [desc, setDesc] = useState(expense?.desc || "");
  const [category, setCategory] = useState(expense?.category || "insumos");
  const [value, setValue] = useState(expense?.value?.toString().replace(".", ",") || "");
  const [linkedItemId, setLinkedItemId] = useState(expense?.linkedItemId || "");

  const handleSubmit = () => {
    if (!desc || !value) { alert("Preencha descrição e valor"); return; }
    onSave({
      id: expense?.id, date, desc, category,
      value: parseFloat(value.replace(",", ".")),
      linkedItemId: linkedItemId || null
    });
  };

  const categories = [
    { v: "insumos", l: "Insumos" },
    { v: "embalagem", l: "Embalagem" },
    { v: "equipamento", l: "Equipamento" },
    { v: "outros", l: "Outros" },
  ];

  return (
    <div>
      <label className="label">Data</label>
      <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Descrição</label>
      <input className="input" placeholder="Ex: Compra de refrigerantes" value={desc} onChange={e => setDesc(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Valor</label>
      <input className="input" inputMode="decimal" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Categoria</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c.v} onClick={() => setCategory(c.v)} className="btn-press" style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid",
            borderColor: category === c.v ? "var(--accent)" : "var(--line)",
            background: category === c.v ? "var(--accent)" : "var(--surface)",
            color: category === c.v ? "#fff" : "var(--ink)",
            fontSize: 13, fontWeight: 500, cursor: "pointer"
          }}>{c.l}</button>
        ))}
      </div>

      <label className="label">Vincular a item do cardápio (opcional)</label>
      <select className="input" value={linkedItemId} onChange={e => setLinkedItemId(e.target.value)} style={{ marginBottom: 16 }}>
        <option value="">Nenhum</option>
        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
      </select>

      <button onClick={handleSubmit} className="btn-press" style={{
        width: "100%", padding: 14, background: "var(--accent)", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
      }}>
        {expense ? "Salvar alterações" : "Registrar gasto"}
      </button>
    </div>
  );
}

// ============================================================
// ITEMS SCREEN
// ============================================================
function ItemsScreen({ items, setItems }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = async (item) => {
    const updated = editing
      ? items.map(i => i.id === item.id ? item : i)
      : [...items, { ...item, id: uid() }];
    setItems(updated);
    await save(K.items, updated);
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este item do cardápio?")) return;
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    await save(K.items, updated);
  };

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 className="display-font" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Cardápio</h1>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>Itens e estoque</div>
        </div>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-press" style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>
          <Plus size={16} /> Item
        </button>
      </div>

      {items.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Package size={32} color="var(--ink-faint)" style={{ marginBottom: 12 }} />
          <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Nenhum item cadastrado</div>
        </div>
      )}

      {items.map(it => {
        const margem = it.cost ? ((it.price - it.cost) / it.price) * 100 : 0;
        const lowStock = it.stock !== null && it.stock !== undefined && it.stock <= 5;
        return (
          <div key={it.id} className="card" style={{ padding: 14, marginBottom: 8, cursor: "pointer" }}
            onClick={() => { setEditing(it); setShowAdd(true); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{it.name}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--ink-soft)", flexWrap: "wrap" }}>
                  <div>Custo: <span className="num-font">{brl(it.cost)}</span></div>
                  <div>Venda: <span className="num-font" style={{ color: "var(--success)", fontWeight: 600 }}>{brl(it.price)}</span></div>
                </div>
                {it.cost > 0 && (
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                    Margem: {margem.toFixed(0)}% · Lucro/un: {brl(it.price - it.cost)}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {it.stock !== null && it.stock !== undefined && (
                  <div style={{
                    fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                    background: lowStock ? "var(--danger-soft)" : "var(--success-soft)",
                    color: lowStock ? "var(--danger)" : "var(--success)",
                    display: "inline-block"
                  }}>
                    Estoque: {it.stock}
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }} style={{
                    background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer"
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Sheet open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Editar item" : "Novo item"}>
        <ItemForm item={editing} onSave={handleSave} />
      </Sheet>
    </div>
  );
}

function ItemForm({ item, onSave }) {
  const [name, setName] = useState(item?.name || "");
  const [price, setPrice] = useState(item?.price?.toString().replace(".", ",") || "");
  const [cost, setCost] = useState(item?.cost?.toString().replace(".", ",") || "");
  const [stock, setStock] = useState(item?.stock?.toString() || "");
  const [trackStock, setTrackStock] = useState(item?.stock !== null && item?.stock !== undefined);

  const handleSubmit = () => {
    if (!name || !price) { alert("Preencha nome e preço"); return; }
    onSave({
      id: item?.id,
      name,
      price: parseFloat(price.replace(",", ".")),
      cost: cost ? parseFloat(cost.replace(",", ".")) : 0,
      stock: trackStock ? parseInt(stock || "0") : null,
    });
  };

  return (
    <div>
      <label className="label">Nome do item</label>
      <input className="input" placeholder="Ex: Coxinha, Refri lata, Pão de queijo" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Preço de venda</label>
          <input className="input" inputMode="decimal" placeholder="0,00" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Custo unitário</label>
          <input className="input" inputMode="decimal" placeholder="0,00" value={cost} onChange={e => setCost(e.target.value)} />
        </div>
      </div>

      <div style={{
        background: "var(--surface-2)", padding: 12, borderRadius: 10, marginBottom: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Controlar estoque?</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Diminui automaticamente a cada venda</div>
        </div>
        <button onClick={() => setTrackStock(!trackStock)} style={{
          width: 44, height: 26, borderRadius: 13, border: "none",
          background: trackStock ? "var(--accent)" : "var(--line)",
          position: "relative", cursor: "pointer", transition: "background 200ms"
        }}>
          <div style={{
            position: "absolute", top: 3, left: trackStock ? 22 : 3,
            width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 200ms"
          }} />
        </button>
      </div>

      {trackStock && (
        <div style={{ marginBottom: 14 }}>
          <label className="label">Quantidade em estoque</label>
          <input className="input" inputMode="numeric" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
      )}

      <button onClick={handleSubmit} className="btn-press" style={{
        width: "100%", padding: 14, background: "var(--accent)", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
      }}>
        {item ? "Salvar alterações" : "Adicionar ao cardápio"}
      </button>
    </div>
  );
}

// ============================================================
// ORDERS SCREEN
// ============================================================
function OrdersScreen({ orders, setOrders }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("pendente");

  const handleSave = async (order) => {
    const updated = editing
      ? orders.map(o => o.id === order.id ? order : o)
      : [...orders, { ...order, id: uid() }];
    setOrders(updated);
    await save(K.orders, updated);
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta encomenda?")) return;
    const updated = orders.filter(o => o.id !== id);
    setOrders(updated);
    await save(K.orders, updated);
  };

  const toggleStatus = async (order) => {
    const newStatus = order.status === "pendente" ? "pago" : "pendente";
    const updated = orders.map(o => o.id === order.id ? { ...o, status: newStatus } : o);
    setOrders(updated);
    await save(K.orders, updated);
  };

  const filtered = orders
    .filter(o => filter === "todos" || o.status === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 className="display-font" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Encomendas</h1>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-press" style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>
          <Plus size={16} /> Encomenda
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { v: "pendente", l: "Pendentes" },
          { v: "pago", l: "Pagas" },
          { v: "todos", l: "Todas" },
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className="btn-press" style={{
            flex: 1, padding: 10, borderRadius: 10, border: "1px solid",
            borderColor: filter === f.v ? "var(--accent)" : "var(--line)",
            background: filter === f.v ? "var(--accent-soft)" : "var(--surface)",
            color: filter === f.v ? "var(--accent)" : "var(--ink-soft)",
            fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <CalendarCheck size={32} color="var(--ink-faint)" style={{ marginBottom: 12 }} />
          <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Nenhuma encomenda</div>
        </div>
      )}

      {filtered.map(o => {
        const isPending = o.status === "pendente";
        const isOverdue = isPending && o.dueDate < today();
        return (
          <div key={o.id} className="card" style={{ padding: 14, marginBottom: 8, cursor: "pointer" }}
            onClick={() => { setEditing(o); setShowAdd(true); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: isPending ? "var(--warn-soft)" : "var(--success-soft)",
                    color: isPending ? "var(--warn)" : "var(--success)",
                    textTransform: "uppercase", letterSpacing: "0.05em"
                  }}>
                    {isPending ? "Pendente" : "Pago"}
                  </div>
                  {isOverdue && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                      background: "var(--danger-soft)", color: "var(--danger)",
                      textTransform: "uppercase", letterSpacing: "0.05em"
                    }}>Atrasada</div>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{o.customer}</div>
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{o.item}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> Retirada: {fmtDate(o.dueDate)}
                </div>
                {o.notes && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4, fontStyle: "italic" }}>"{o.notes}"</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num-font display-font" style={{ fontSize: 18, fontWeight: 600 }}>{brl(o.value)}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(o); }} className="btn-press" style={{
                    padding: "4px 8px", borderRadius: 6, border: "1px solid",
                    borderColor: isPending ? "var(--success)" : "var(--warn)",
                    background: isPending ? "var(--success-soft)" : "var(--warn-soft)",
                    color: isPending ? "var(--success)" : "var(--warn)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 3
                  }}>
                    <Check size={11} /> {isPending ? "Marcar pago" : "Reverter"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }} style={{
                    background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer"
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Sheet open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Editar encomenda" : "Nova encomenda"}>
        <OrderForm order={editing} onSave={handleSave} />
      </Sheet>
    </div>
  );
}

function OrderForm({ order, onSave }) {
  const [customer, setCustomer] = useState(order?.customer || "");
  const [item, setItem] = useState(order?.item || "");
  const [value, setValue] = useState(order?.value?.toString().replace(".", ",") || "");
  const [dueDate, setDueDate] = useState(order?.dueDate || today());
  const [status, setStatus] = useState(order?.status || "pendente");
  const [notes, setNotes] = useState(order?.notes || "");

  const handleSubmit = () => {
    if (!customer || !item || !value) { alert("Preencha cliente, item e valor"); return; }
    onSave({
      id: order?.id, customer, item,
      value: parseFloat(value.replace(",", ".")),
      dueDate, status, notes
    });
  };

  return (
    <div>
      <label className="label">Nome do cliente</label>
      <input className="input" placeholder="Ex: Irmã Maria" value={customer} onChange={e => setCustomer(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Item encomendado</label>
      <input className="input" placeholder="Ex: Bolo de cenoura 12 fatias" value={item} onChange={e => setItem(e.target.value)} style={{ marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Valor</label>
          <input className="input" inputMode="decimal" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Retirada</label>
          <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <label className="label">Status</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setStatus("pendente")} className="btn-press" style={{
          flex: 1, padding: 10, borderRadius: 8, border: "1px solid",
          borderColor: status === "pendente" ? "var(--warn)" : "var(--line)",
          background: status === "pendente" ? "var(--warn-soft)" : "var(--surface)",
          color: status === "pendente" ? "var(--warn)" : "var(--ink-soft)",
          fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>Pendente</button>
        <button onClick={() => setStatus("pago")} className="btn-press" style={{
          flex: 1, padding: 10, borderRadius: 8, border: "1px solid",
          borderColor: status === "pago" ? "var(--success)" : "var(--line)",
          background: status === "pago" ? "var(--success-soft)" : "var(--surface)",
          color: status === "pago" ? "var(--success)" : "var(--ink-soft)",
          fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>Pago</button>
      </div>

      <label className="label">Observações (opcional)</label>
      <textarea className="input" rows={2} placeholder="Recheio, decoração, alergias..." value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 14, resize: "vertical" }} />

      <button onClick={handleSubmit} className="btn-press" style={{
        width: "100%", padding: 14, background: "var(--accent)", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
      }}>
        {order ? "Salvar alterações" : "Registrar encomenda"}
      </button>
    </div>
  );
}

// ============================================================
// REPORTS SCREEN
// ============================================================
function ReportsScreen({ sales, expenses, transfers, items, setTransfers }) {
  const [period, setPeriod] = useState("month");
  const [showTransfer, setShowTransfer] = useState(false);

  const data = useMemo(() => {
    const now = new Date();
    let startDate;
    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(0);
    }
    const startISO = startDate.toISOString().slice(0, 10);

    const filteredSales = sales.filter(s => s.date >= startISO);
    const filteredExp = expenses.filter(e => e.date >= startISO);
    const filteredTr = transfers.filter(t => t.date >= startISO);

    const revenue = filteredSales.reduce((s, x) => s + x.total, 0);
    const cost = filteredExp.reduce((s, x) => s + x.value, 0);
    const profit = revenue - cost;
    const transferred = filteredTr.reduce((s, x) => s + x.value, 0);

    const byService = {};
    filteredSales.forEach(s => {
      if (!byService[s.service]) byService[s.service] = { count: 0, total: 0 };
      byService[s.service].count++;
      byService[s.service].total += s.total;
    });

    const byPayment = { pix: 0, dinheiro: 0, outros: 0 };
    filteredSales.forEach(s => { byPayment[s.payment] = (byPayment[s.payment] || 0) + s.total; });

    const fiados = filteredSales.filter(s => s.payment === "outros" && s.fiadoNome);

    const byItem = {};
    filteredSales.forEach(s => {
      s.items.forEach(si => {
        const key = si.itemId || si.name;
        if (!byItem[key]) {
          const catalogItem = items.find(it => it.id === si.itemId);
          byItem[key] = {
            name: si.name,
            qty: 0,
            revenue: 0,
            cost: catalogItem?.cost || 0
          };
        }
        byItem[key].qty += si.qty;
        byItem[key].revenue += si.qty * si.price;
      });
    });

    return { revenue, cost, profit, transferred, byService, byPayment, byItem, fiados, sales: filteredSales, expenses: filteredExp, transfers: filteredTr };
  }, [sales, expenses, transfers, items, period]);

  const handleAddTransfer = async (transfer) => {
    const updated = [...transfers, { ...transfer, id: uid() }];
    setTransfers(updated);
    await save(K.transfers, updated);
    setShowTransfer(false);
  };

  const exportPDF = () => {
    const periodLabel = period === "week" ? "última semana" : period === "month" ? "mês atual" : "todo período";

    const css = [
      "body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:30px;color:#1a1a1a}",
      "h1{font-size:28px;border-bottom:2px solid #6b4423;padding-bottom:12px;color:#6b4423}",
      "h2{font-size:18px;color:#6b4423;margin-top:28px}",
      ".grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:20px 0}",
      ".stat{background:#f4f1ec;padding:16px;border-radius:8px}",
      ".stat .lbl{font-size:11px;text-transform:uppercase;color:#8a857f;letter-spacing:.05em}",
      ".stat .val{font-size:22px;font-weight:600;margin-top:4px}",
      "table{width:100%;border-collapse:collapse;margin:12px 0}",
      "th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e8e3dc;font-size:13px}",
      "th{background:#f4f1ec;font-weight:600}",
      ".num{text-align:right;font-variant-numeric:tabular-nums}",
      ".hi{background:linear-gradient(135deg,#6b4423,#8b5a2b);color:#faf8f5;padding:20px;border-radius:10px;margin:16px 0}",
      ".hi .lbl{font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.05em}",
      ".hi .val{font-size:32px;font-weight:600;margin-top:4px}",
      ".footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8e3dc;font-size:11px;color:#8a857f;text-align:center}",
      "@media print{body{margin:0;padding:20px}}"
    ].join("");

    const rowsCulto = Object.entries(data.byService)
      .map(function(entry) {
        var s = entry[0]; var v = entry[1];
        return "<tr><td>" + s + "</td><td class='num'>" + v.count + "</td><td class='num'>" + brl(v.total) + "</td><td class='num'>" + brl(v.total / v.count) + "</td></tr>";
      }).join("");

    const rowsItens = Object.values(data.byItem)
      .sort(function(a, b) { return b.revenue - a.revenue; })
      .map(function(i) {
        return "<tr><td>" + i.name + "</td><td class='num'>" + i.qty + "</td><td class='num'>" + brl(i.revenue) + "</td><td class='num'>" + brl(i.revenue - i.cost * i.qty) + "</td></tr>";
      }).join("");

    var repasses = "";
    if (data.transfers.length === 0) {
      repasses = "<p style='color:#8a857f'>Nenhum repasse registrado neste período.</p>";
    } else {
      var rowsTr = data.transfers.map(function(t) {
        return "<tr><td>" + fmtDate(t.date) + "</td><td>" + (t.notes || "-") + "</td><td class='num'>" + brl(t.value) + "</td></tr>";
      }).join("");
      repasses = "<table><tr><th>Data</th><th>Observação</th><th class='num'>Valor</th></tr>" + rowsTr + "<tr style='font-weight:600;background:#f4f1ec'><td colspan='2'>Total repassado</td><td class='num'>" + brl(data.transferred) + "</td></tr></table>";
    }

    var fiadoSection = "";
    if (data.fiados.length > 0) {
      var rowsFiado = data.fiados.map(function(s) {
        var itensStr = s.items.map(function(i) { return i.qty + "x " + i.name; }).join(", ");
        return "<tr><td>" + fmtDate(s.date) + "</td><td>" + s.fiadoNome + "</td><td>" + (s.fiadoTel || "-") + "</td><td>" + itensStr + "</td><td class='num'>" + brl(s.total) + "</td></tr>";
      }).join("");
      var totalFiado = data.fiados.reduce(function(acc, x) { return acc + x.total; }, 0);
      fiadoSection = "<h2 style='color:#b45309'>Fiados pendentes de cobrança</h2>" +
        "<table><tr><th>Data</th><th>Nome</th><th>Telefone</th><th>Itens</th><th class='num'>Valor</th></tr>" +
        rowsFiado +
        "<tr style='font-weight:600;background:#fef3c7'><td colspan='4'>Total em fiado</td><td class='num'>" + brl(totalFiado) + "</td></tr></table>";
    }

    var pct = function(v) { return data.revenue ? ((v / data.revenue) * 100).toFixed(1) : "0"; };
    var saldo = brl(Math.max(0, data.profit - data.transferred));

    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Relatório Conveniência</title><style>" + css + "</style></head><body>" +
      "<h1>Relatório da Conveniência</h1>" +
      "<div style='color:#5a5550;font-size:13px'>Período: " + periodLabel + " · Gerado em " + new Date().toLocaleDateString("pt-BR") + "</div>" +
      "<div class='hi'><div class='lbl'>Lucro líquido do período</div><div class='val'>" + brl(data.profit) + "</div></div>" +
      "<div class='grid'>" +
        "<div class='stat'><div class='lbl'>Faturamento</div><div class='val'>" + brl(data.revenue) + "</div></div>" +
        "<div class='stat'><div class='lbl'>Gastos</div><div class='val'>" + brl(data.cost) + "</div></div>" +
        "<div class='stat'><div class='lbl'>Já repassado</div><div class='val'>" + brl(data.transferred) + "</div></div>" +
      "</div>" +
      "<h2>Vendas por culto</h2>" +
      "<table><tr><th>Culto/Evento</th><th class='num'>Ocorrências</th><th class='num'>Total</th><th class='num'>Média</th></tr>" + rowsCulto + "</table>" +
      "<h2>Por forma de pagamento</h2>" +
      "<table><tr><th>Forma</th><th class='num'>Total</th><th class='num'>%</th></tr>" +
        "<tr><td>Pix</td><td class='num'>" + brl(data.byPayment.pix) + "</td><td class='num'>" + pct(data.byPayment.pix) + "%</td></tr>" +
        "<tr><td>Dinheiro</td><td class='num'>" + brl(data.byPayment.dinheiro) + "</td><td class='num'>" + pct(data.byPayment.dinheiro) + "%</td></tr>" +
        "<tr><td>Outros/Fiado</td><td class='num'>" + brl(data.byPayment.outros) + "</td><td class='num'>" + pct(data.byPayment.outros) + "%</td></tr>" +
      "</table>" +
      "<h2>Itens mais vendidos</h2>" +
      "<table><tr><th>Item</th><th class='num'>Qtd</th><th class='num'>Faturado</th><th class='num'>Lucro estimado</th></tr>" + rowsItens + "</table>" +
      "<h2>Repasses para a igreja</h2>" + repasses +
      fiadoSection +
      "<div class='footer'>Relatório gerado automaticamente · Conveniência Pós-Culto<br/>Saldo a repassar: <strong>" + saldo + "</strong></div>" +
      "</body></html>";

    var win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(function() { win.print(); }, 500);
    }
  };

  const topItems = Object.values(data.byItem).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div style={{ padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 className="display-font" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Relatórios</h1>
        <button onClick={exportPDF} className="btn-press" style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, cursor: "pointer"
        }}>
          <FileText size={14} /> PDF
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { v: "week", l: "7 dias" },
          { v: "month", l: "Mês" },
          { v: "all", l: "Tudo" },
        ].map(p => (
          <button key={p.v} onClick={() => setPeriod(p.v)} className="btn-press" style={{
            flex: 1, padding: 10, borderRadius: 10, border: "1px solid",
            borderColor: period === p.v ? "var(--accent)" : "var(--line)",
            background: period === p.v ? "var(--accent-soft)" : "var(--surface)",
            color: period === p.v ? "var(--accent)" : "var(--ink-soft)",
            fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>{p.l}</button>
        ))}
      </div>

      <div style={{
        background: "linear-gradient(135deg, #6b4423 0%, #8b5a2b 100%)",
        borderRadius: 18, padding: 20, color: "#faf8f5", marginBottom: 16,
        boxShadow: "0 4px 20px rgba(107, 68, 35, 0.15)"
      }}>
        <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          Lucro do período
        </div>
        <div className="num-font display-font" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>
          {brl(data.profit)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12, opacity: 0.92 }}>
          <div>
            <div style={{ opacity: 0.7, fontSize: 10 }}>Faturado</div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(data.revenue)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: 10 }}>Gastos</div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(data.cost)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: 10 }}>Margem</div>
            <div className="num-font" style={{ fontWeight: 600 }}>
              {data.revenue ? ((data.profit / data.revenue) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Por culto</h3>
        {Object.keys(data.byService).length === 0 ? (
          <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "10px 0" }}>Sem dados no período</div>
        ) : Object.entries(data.byService).sort((a, b) => b[1].total - a[1].total).map(([service, v]) => (
          <div key={service} style={{
            display: "flex", justifyContent: "space-between", padding: "8px 0",
            borderBottom: "1px solid var(--line)"
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{service}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{v.count} venda(s) · média {brl(v.total / v.count)}</div>
            </div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(v.total)}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Forma de pagamento</h3>
        {["pix", "dinheiro", "outros"].map(p => {
          const v = data.byPayment[p] || 0;
          const pct = data.revenue ? (v / data.revenue) * 100 : 0;
          const labels = { pix: "Pix", dinheiro: "Dinheiro", outros: "Outros / Fiado" };
          return (
            <div key={p} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <div>{labels[p]}</div>
                <div className="num-font" style={{ fontWeight: 600 }}>{brl(v)} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>· {pct.toFixed(0)}%</span></div>
              </div>
              <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: p === "pix" ? "var(--success)" : p === "dinheiro" ? "var(--accent)" : "var(--warn)",
                  transition: "width 400ms"
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {topItems.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Itens mais lucrativos</h3>
          {topItems.map((it, idx) => {
            const profit = it.revenue - (it.cost * it.qty);
            return (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: idx < topItems.length - 1 ? "1px solid var(--line)" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12, background: "var(--accent-soft)",
                    color: "var(--accent)", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{it.qty} unidades · {brl(it.revenue)}</div>
                  </div>
                </div>
                <div className="num-font" style={{ fontWeight: 600, color: "var(--success)" }}>+{brl(profit)}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.fiados.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12, border: "1px solid #f5deb3" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "var(--warn)" }}>
            ⚠️ Fiados pendentes ({data.fiados.length})
          </h3>
          <div style={{
            background: "var(--warn-soft)", borderRadius: 8, padding: "8px 12px",
            marginBottom: 10, display: "flex", justifyContent: "space-between"
          }}>
            <div style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600 }}>Total em aberto</div>
            <div className="num-font" style={{ fontWeight: 700, color: "var(--warn)" }}>
              {brl(data.fiados.reduce((s, x) => s + x.total, 0))}
            </div>
          </div>
          {data.fiados.map(s => (
            <div key={s.id} style={{
              padding: "8px 0", borderBottom: "1px solid var(--line)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.fiadoNome}</div>
                  {s.fiadoTel && (
                    <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{s.fiadoTel}</div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {fmtDate(s.date)} · {s.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                </div>
                <div className="num-font" style={{ fontWeight: 600, color: "var(--warn)" }}>{brl(s.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Repasses para a igreja</h3>
          <button onClick={() => setShowTransfer(true)} className="btn-press" style={{
            background: "var(--accent-soft)", color: "var(--accent)", border: "none",
            borderRadius: 8, padding: "6px 10px", fontWeight: 600, fontSize: 12,
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer"
          }}>
            <Plus size={12} /> Novo
          </button>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "10px 12px",
          background: "var(--success-soft)", borderRadius: 8, marginBottom: 10
        }}>
          <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>Saldo a repassar</div>
          <div className="num-font" style={{ fontWeight: 700, color: "var(--success)" }}>
            {brl(Math.max(0, data.profit - data.transferred))}
          </div>
        </div>
        {data.transfers.length === 0 ? (
          <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "10px 0" }}>Nenhum repasse no período</div>
        ) : [...data.transfers].reverse().map(t => (
          <div key={t.id} style={{
            display: "flex", justifyContent: "space-between", padding: "8px 0",
            borderBottom: "1px solid var(--line)"
          }}>
            <div>
              <div style={{ fontSize: 13 }}>{t.notes || "Repasse"}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmtDate(t.date)}</div>
            </div>
            <div className="num-font" style={{ fontWeight: 600 }}>{brl(t.value)}</div>
          </div>
        ))}
      </div>

      <Sheet open={showTransfer} onClose={() => setShowTransfer(false)} title="Novo repasse">
        <TransferForm
          suggestedValue={Math.max(0, data.profit - data.transferred)}
          onSave={handleAddTransfer}
        />
      </Sheet>
    </div>
  );
}

function TransferForm({ suggestedValue, onSave }) {
  const [date, setDate] = useState(today());
  const [value, setValue] = useState(suggestedValue ? suggestedValue.toFixed(2).replace(".", ",") : "");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!value) { alert("Informe o valor"); return; }
    onSave({ date, value: parseFloat(value.replace(",", ".")), notes });
  };

  return (
    <div>
      {suggestedValue > 0 && (
        <div style={{
          background: "var(--success-soft)", padding: 12, borderRadius: 10, marginBottom: 14,
          fontSize: 13, color: "var(--success)"
        }}>
          💡 Saldo disponível para repasse: <strong>{brl(suggestedValue)}</strong>
        </div>
      )}
      <label className="label">Data do repasse</label>
      <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Valor repassado</label>
      <input className="input" inputMode="decimal" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} style={{ marginBottom: 12 }} />

      <label className="label">Observação</label>
      <input className="input" placeholder="Ex: Repasse de novembro" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 14 }} />

      <button onClick={handleSubmit} className="btn-press" style={{
        width: "100%", padding: 14, background: "var(--accent)", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer"
      }}>
        Registrar repasse
      </button>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function BottomNav({ current, onChange }) {
  const tabs = [
    { id: "home", label: "Início", Icon: Home },
    { id: "sales", label: "Vendas", Icon: ShoppingBag },
    { id: "expenses", label: "Gastos", Icon: Receipt },
    { id: "items", label: "Cardápio", Icon: Package },
    { id: "orders", label: "Encomendas", Icon: CalendarCheck },
    { id: "reports", label: "Relatórios", Icon: BarChart3 },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--surface)", borderTop: "1px solid var(--line)",
      display: "flex", justifyContent: "space-around",
      paddingTop: 8, paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      maxWidth: 480, margin: "0 auto", zIndex: 40
    }}>
      {tabs.map(t => {
        const active = current === t.id;
        const Icon = t.Icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className="btn-press" style={{
            background: "none", border: "none", padding: "4px 6px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: active ? "var(--accent)" : "var(--ink-faint)",
            cursor: "pointer", flex: 1, minWidth: 0
          }}>
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <div style={{ fontSize: 10, fontWeight: active ? 600 : 500, whiteSpace: "nowrap" }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    (async () => {
      const [i, s, e, o, t] = await Promise.all([
        load(K.items, []),
        load(K.sales, []),
        load(K.expenses, []),
        load(K.orders, []),
        load(K.transfers, []),
      ]);

      if (i.length === 0) {
        const seed = [
          { id: uid(), name: "Água 500ml", price: 3, cost: 1, stock: 24 },
          { id: uid(), name: "Refri lata", price: 5, cost: 2.8, stock: 24 },
          { id: uid(), name: "Suco caixinha", price: 4, cost: 1.8, stock: 12 },
          { id: uid(), name: "Café no copo", price: 2, cost: 0.4, stock: null },
          { id: uid(), name: "Salgado assado", price: 4, cost: 1.2, stock: null },
          { id: uid(), name: "Coxinha", price: 5, cost: 1.5, stock: null },
          { id: uid(), name: "Pão de queijo", price: 3, cost: 0.8, stock: null },
          { id: uid(), name: "Fatia de bolo", price: 4, cost: 1, stock: null },
          { id: uid(), name: "Brigadeiro pote", price: 5, cost: 1.8, stock: null },
          { id: uid(), name: "Bombom", price: 3, cost: 1.2, stock: 30 },
        ];
        setItems(seed);
        await save(K.items, seed);
      } else {
        setItems(i);
      }
      setSales(s); setExpenses(e); setOrders(o); setTransfers(t);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{styles}</style>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center" }}>
          <Church size={36} color="var(--accent)" />
          <div style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14 }}>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{styles}</style>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {tab === "home" && <Dashboard sales={sales} expenses={expenses} orders={orders} transfers={transfers} items={items} goTo={setTab} />}
      {tab === "sales" && <SalesScreen sales={sales} items={items} setSales={setSales} setItems={setItems} />}
      {tab === "expenses" && <ExpensesScreen expenses={expenses} items={items} setExpenses={setExpenses} />}
      {tab === "items" && <ItemsScreen items={items} setItems={setItems} />}
      {tab === "orders" && <OrdersScreen orders={orders} setOrders={setOrders} />}
      {tab === "reports" && <ReportsScreen sales={sales} expenses={expenses} transfers={transfers} items={items} setTransfers={setTransfers} />}

      <BottomNav current={tab} onChange={setTab} />
    </div>
  );
}
