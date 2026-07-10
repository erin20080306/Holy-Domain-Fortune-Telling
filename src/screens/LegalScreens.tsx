import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

function LegalLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl animate-[fadeIn_0.5s_ease-out] pb-8">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-xs tracking-[0.22em] text-[#A89882]">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl font-light tracking-widest text-white">{title}</h2>
        <p className="mt-3 text-xs tracking-wide text-white/45">生效日期：2026 年 7 月 11 日</p>
      </header>
      <div className="space-y-7 text-sm font-light leading-8 tracking-wide text-slate-300">
        {children}
      </div>
      <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm">
        <Link className="text-[#A89882]" to="/privacy">隱私政策</Link>
        <Link className="text-[#A89882]" to="/terms">服務條款</Link>
        <a className="text-[#A89882]" href="mailto:erin20080306@gmail.com">聯絡客服</a>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-base font-medium tracking-widest text-[#f3ead9]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function PrivacyScreen() {
  return (
    <LegalLayout eyebrow="PRIVACY POLICY" title="隱私政策">
      <Section title="我們蒐集的資料">
        <p>帳戶資料可能包含姓名、電子郵件、電話；命理資料可能包含出生日期、時間、性別、出生地、時區、提問與你選擇保存的深度報告。</p>
        <p>系統也會記錄方案、功能使用次數、登入時間、IP、瀏覽器／裝置資訊及必要的錯誤與成本紀錄，用於帳戶安全與服務維運。</p>
      </Section>
      <Section title="資料使用目的">
        <p>資料用於建立帳戶、排盤與產生解讀、保存報告、執行訂閱額度、處理付款核對、客服聯繫、防止濫用及改善服務穩定性。</p>
      </Section>
      <Section title="第三方服務">
        <p>帳戶與資料庫由 Supabase 等雲端服務處理；網站部署使用 Vercel；付款使用 PayPal；命理解讀內容可能傳送至伺服器端設定的文字生成服務。前端不會取得服務端金鑰。</p>
      </Section>
      <Section title="保存與刪除">
        <p>你可以在設定中刪除個別歷史報告，或申請刪除整個帳號。帳號刪除後，與帳號直接關聯的個人資料與命理報告會依系統流程移除；依法或為付款爭議、安全稽核所需的最低限度紀錄可能保留一段必要期間。</p>
      </Section>
      <Section title="你的選擇與聯絡方式">
        <p>你可要求查詢、更正或刪除帳戶資料。若有隱私問題，請寄信至 erin20080306@gmail.com。</p>
      </Section>
    </LegalLayout>
  );
}

export function TermsScreen() {
  return (
    <LegalLayout eyebrow="TERMS OF SERVICE" title="服務條款">
      <Section title="服務性質">
        <p>MYSTIC 提供命理排盤、抽牌與文字解讀，目的為個人反思與娛樂參考。內容不是醫療、心理治療、法律、投資、稅務或其他專業意見，也不保證特定結果。</p>
      </Section>
      <Section title="排盤與解讀限制">
        <p>八字、紫微、生肖與生命靈數會先由程式計算資料，再由文字生成服務解讀；其他標示「通則指引」的項目尚未具備完整專業引擎。不同流派、出生資料誤差與生成內容差異都可能影響結果。</p>
      </Section>
      <Section title="帳戶與使用規範">
        <p>你應提供正確資料並妥善保管密碼，不得以自動化、並行請求、偽造付款或其他方式繞過方案額度、干擾服務或侵害他人權益。</p>
      </Section>
      <Section title="方案、付款與額度">
        <p>各方案功能與每月次數以購買頁及系統顯示為準。額度依台北時區的日／月週期計算。付款完成後可能需要短暫核對；若方案未開通，請使用客服表單聯繫。</p>
      </Section>
      <Section title="取消、退款與帳號刪除">
        <p>PayPal 訂閱需先在 PayPal 或透過客服完成取消，再刪除 MYSTIC 帳號。退款會依付款狀態、已使用額度與個案情況處理；送出前請提供帳戶信箱與交易資料。</p>
      </Section>
      <Section title="服務變更">
        <p>我們可能因安全、法規、成本或功能調整更新服務與條款；重大變更會盡量於服務內告知。繼續使用代表你接受更新後內容。</p>
      </Section>
    </LegalLayout>
  );
}
