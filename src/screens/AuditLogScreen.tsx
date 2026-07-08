import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';

export function AuditLogScreen() {
  const nav = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void api.admin.auditLogs(page).then((r) => {
      if (r?.ok) {
        setLogs(r.logs);
        setTotal(r.total);
      }
    });
  }, [page]);

  return (
    <div className="app-shell" style={{ maxWidth: 900 }}>
      <button
        onClick={() => nav('/admin')}
        className="absolute top-8 left-8 text-white/30 hover:text-[#A89882] transition-colors"
      >
        <ChevronLeft size={24} />
      </button>
      <div className="row" style={{ justifyContent: 'space-between', paddingTop: 60 }}>
        <h1 className="brand-title" style={{ fontSize: 28, margin: 0 }}>
          操作紀錄
        </h1>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => nav('/admin')}>
          返回
        </button>
      </div>
      <div className="spacer" />
      <div className="glass-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>時間</th>
                <th>管理員</th>
                <th>對象</th>
                <th>動作</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{(l.created_at ?? '').slice(0, 19).replace('T', ' ')}</td>
                  <td>{(l.admin_user_id ?? '').slice(0, 8)}</td>
                  <td>{(l.target_user_id ?? '—').slice(0, 8)}</td>
                  <td>{l.action}</td>
                  <td>{l.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn ghost"
            style={{ width: 'auto' }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一頁
          </button>
          <span className="muted">共 {total} 筆</span>
          <button
            className="btn ghost"
            style={{ width: 'auto' }}
            disabled={page >= Math.ceil(total / 30)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}
