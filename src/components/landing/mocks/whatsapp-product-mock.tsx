export function WhatsappProductMock() {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#2a3942] bg-[#0b141a] shadow-[var(--shadow-lift)] ring-1 ring-black/20">
        {/* Chat header */}
        <div className="flex items-center gap-2 bg-[#1f2c34] px-2 py-2.5">
          <span
            aria-hidden
            className="flex h-8 w-6 items-center justify-center text-white/80"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path
                d="M8.5 1.5 1.5 8l7 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-sm font-semibold text-white">
            VC
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-medium leading-tight text-white">
              Voltou Calçados
            </p>
            <p className="truncate text-[12px] leading-tight text-white/55">
              online
            </p>
          </div>
          <div className="flex items-center gap-4 pr-2 text-white/85" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.4 21 3 13.6 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
            </svg>
            <span className="flex flex-col gap-0.5 px-0.5">
              <span className="h-1 w-1 rounded-full bg-white/85" />
              <span className="h-1 w-1 rounded-full bg-white/85" />
              <span className="h-1 w-1 rounded-full bg-white/85" />
            </span>
          </div>
        </div>

        {/* Messages */}
        <div
          className="relative space-y-2 px-2.5 py-3"
          style={{
            backgroundColor: '#0b141a',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <p className="mx-auto w-fit rounded-md bg-[#182229] px-2.5 py-1 text-[11px] text-white/45 shadow-sm">
            Hoje
          </p>

          {/* Outgoing — loja */}
          <div className="ml-auto max-w-[88%]">
            <div className="relative rounded-lg rounded-tr-none bg-[#005c4b] px-2.5 pb-1.5 pt-1.5 text-left text-[13.5px] leading-[1.35] text-[#e9edef] shadow-sm">
              <span
                aria-hidden
                className="absolute -right-[6px] top-0 h-0 w-0 border-l-[6px] border-t-[6px] border-l-[#005c4b] border-t-transparent"
              />
              Oi! Vi que você levou o tênis — a meia técnica combina bem com
              ele.
              <br />
              <br />
              Cupom{' '}
              <span className="font-semibold tracking-wide">VOLTOU12</span> +
              meia com desconto.
              <div className="mt-2 overflow-hidden rounded-md bg-[#025144]">
                <div className="border-l-[3px] border-[#53bdeb] px-2.5 py-2">
                  <p className="text-[12px] font-medium text-[#53bdeb]">
                    voltouapp.com
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/70">
                    Pagar com cupom VOLTOU12
                  </p>
                </div>
              </div>
              <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-white/55">
                10:42
                <svg
                  aria-hidden
                  width="16"
                  height="11"
                  viewBox="0 0 16 11"
                  className="text-[#53bdeb]"
                >
                  <path
                    d="M11.1 1.1 5.4 7.3 2.9 4.7 1.7 5.9l3.7 3.8L12.4 2.3z"
                    fill="currentColor"
                  />
                  <path
                    d="M14.3 1.1 8.6 7.3 7.7 6.4l-1.2 1.2 2.1 2.1L15.5 2.3z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* Incoming — cliente */}
          <div className="mr-auto max-w-[78%]">
            <div className="relative rounded-lg rounded-tl-none bg-[#202c33] px-2.5 pb-1.5 pt-1.5 text-left text-[13.5px] leading-[1.35] text-[#e9edef] shadow-sm">
              <span
                aria-hidden
                className="absolute -left-[6px] top-0 h-0 w-0 border-r-[6px] border-t-[6px] border-r-[#202c33] border-t-transparent"
              />
              Paguei! Quero retirar amanhã 💚
              <span className="mt-1 block text-right text-[11px] text-white/45">
                10:44
              </span>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-1.5 bg-[#1f2c34] px-2 py-2">
          <div className="flex min-h-10 flex-1 items-center gap-2 rounded-full bg-[#2a3942] px-3 text-[13px] text-white/40">
            <span aria-hidden className="text-lg leading-none text-white/50">
              🙂
            </span>
            <span className="flex-1 py-2">Mensagem</span>
            <span aria-hidden className="text-white/50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
              </svg>
            </span>
            <span aria-hidden className="text-white/50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
            </span>
          </div>
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
