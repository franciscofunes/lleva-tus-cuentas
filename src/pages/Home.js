import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight, FiCheck, FiLock } from 'react-icons/fi';
import AppFooter from '../components/AppFooter';

// The landing intentionally uses the existing LTC palette and typography.
// Unlike the authenticated dashboard, this is an editorial introduction:
// one main action, real product capabilities, and illustrative (not user) data.
const action =
  'inline-flex min-h-[50px] items-center justify-center gap-3 rounded-lg bg-purple-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/50';
const editorialLabel =
  'text-xs font-bold tracking-[0.08em] text-purple-700 dark:text-purple-300';
const wrap = 'mx-auto w-full max-w-6xl px-5 sm:px-8';

function ProductPagePreview() {
  return (
    <div className='relative mx-auto w-full max-w-[470px] lg:ml-auto' aria-label='Vista ilustrativa del control de tarjetas'>
      <div className='border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/20'>
        <div className='flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-7'>
          <span className='font-Montserrat text-lg font-extrabold tracking-tight'>LTC<span className='text-emerald-600'>$</span></span>
          <span className='text-[11px] text-slate-500 dark:text-slate-400'>Vista ilustrativa</span>
        </div>
        <div className='px-5 pb-6 pt-7 sm:px-7 sm:pb-8'>
          <div className='flex items-center justify-between text-xs text-slate-500 dark:text-slate-400'>
            <span>Mis tarjetas</span>
            <span>ARS · un ciclo</span>
          </div>
          <p className='mt-6 text-sm text-slate-600 dark:text-slate-300'>Todavía podés gastar</p>
          <p className='mt-1 break-words font-Montserrat text-[clamp(2.1rem,6vw,3.25rem)] font-bold tracking-tight tabular-nums leading-tight'>
            $ 70.000<span className='text-slate-400'>,00</span>
          </p>
          <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>Antes de llegar al tope que elegiste.</p>
          <div className='mt-8 flex items-end justify-between gap-3 text-xs'>
            <span className='text-slate-600 dark:text-slate-300'>Del presupuesto utilizado</span>
            <strong className='tabular-nums'>72%</strong>
          </div>
          <div className='mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
            <div className='h-full w-[72%] rounded-full bg-purple-600' />
          </div>
          <div className='mt-8 grid grid-cols-2 gap-5 border-t border-slate-200 pt-5 dark:border-slate-700'>
            <div>
              <p className='text-[11px] text-slate-500 dark:text-slate-400'>Consumos registrados</p>
              <p className='mt-1 text-sm font-bold tabular-nums'>$ 180.000</p>
            </div>
            <div>
              <p className='text-[11px] text-slate-500 dark:text-slate-400'>Tope mensual</p>
              <p className='mt-1 text-sm font-bold tabular-nums'>$ 250.000</p>
            </div>
          </div>
        </div>
      </div>
      <p className='mt-3 text-right text-[11px] text-slate-500 dark:text-slate-400'>
        Ejemplo ilustrativo. No muestra datos reales de ninguna cuenta.
      </p>
    </div>
  );
}

const everyday = [
  {
    number: '01',
    title: 'Movimientos en ARS y USD',
    body: 'Anotá ingresos, gastos y ventas de divisas. Mirá el mes sin tener que armar otra planilla.',
    detail: 'Categorías, períodos y movimientos en dos monedas.',
  },
  {
    number: '02',
    title: 'Bancos y tarjetas organizados',
    body: 'Reuní tus bancos, cuentas y tarjetas. Revisá lo que consumiste y las fechas de cada cierre.',
    detail: 'Consumos actuales, cuentas y pagos.',
  },
  {
    number: '03',
    title: 'Inversiones y portfolio',
    body: 'Seguí las posiciones que registrás y entendé cómo se distribuye tu dinero a lo largo del tiempo.',
    detail: 'Fondos, remuneradas, posiciones y rendimientos informados.',
  },
];

const moreTools = [
  ['Resúmenes y capturas', 'Vinculá PDFs de tarjeta y usá Markdown preparado con ChatGPT para importar consumos revisados por vos.'],
  ['Vencimientos y recordatorios', 'Tené a mano fechas importantes de servicios y tarjetas, con avisos dentro de LTC$.'],
  ['Mapa mundial de movimientos', 'Explorá movimientos con ubicación, desde una vista general hasta zonas más específicas.'],
  ['Gráficos, métricas y exportación', 'Compará períodos y categorías; llevate tus datos a PDF, Excel, CSV o Markdown.'],
];

const litaQuestions = [
  '¿En qué categorías estoy gastando más?',
  '¿Cómo se distribuyen mis inversiones?',
  '¿Qué tope mensual me conviene para mis tarjetas?',
];

function Home() {
  const user = useSelector((state) => state.auth.user);
  const startLink = user ? '/transacciones' : '/registrarse';

  return (
    <>
      <main className='overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-gray-900 dark:text-slate-100'>
        <section className='border-b border-slate-200 dark:border-slate-700' aria-labelledby='home-heading'>
          <div className={wrap + ' grid items-center gap-12 pb-20 pt-14 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-28 lg:pt-28'}>
            <div className='max-w-[640px]'>
              <p className={editorialLabel}>Un lugar para tus finanzas personales</p>
              <h1 id='home-heading' className='mt-6 max-w-[12ch] font-Montserrat text-[clamp(2.7rem,6.5vw,5.6rem)] font-bold leading-[1.08] tracking-[-0.055em]'>
                Tus cuentas, <span className='text-purple-700 dark:text-purple-300'>un poco más claras.</span>
              </h1>
              <p className='mt-7 max-w-[52ch] text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg'>
                Gastos, bancos, tarjetas e inversiones en un mismo lugar.
                Para saber cuánto llevás y decidir con calma.
              </p>
              <div className='mt-8 flex flex-wrap items-center gap-x-6 gap-y-4'>
                <Link to={startLink} className={action}>
                  {user ? 'Ir a mis movimientos' : 'Empezar a organizar mis cuentas'}
                  <FiArrowRight aria-hidden='true' size={18} />
                </Link>
                <a href='#como-funciona'
                  className='inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-purple-700 dark:text-slate-200 dark:decoration-slate-600 dark:hover:text-purple-300'>
                  Ver cómo funciona <FiArrowUpRight aria-hidden='true' size={16} />
                </a>
              </div>
              <p className='mt-7 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400'>
                Cada importe que ves en esta portada es ilustrativo. Tus datos se muestran
                dentro de tu espacio cuando iniciás sesión.
              </p>
            </div>
            <ProductPagePreview />
          </div>
        </section>

        <section id='como-funciona' className={wrap + ' py-20 sm:py-24 lg:py-28'} aria-labelledby='everyday-heading'>
          <div className='grid gap-6 border-b border-slate-200 pb-11 dark:border-slate-700 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20'>
            <p className={editorialLabel}>El día a día</p>
            <div>
              <h2 id='everyday-heading' className='max-w-[22ch] font-Montserrat text-3xl font-bold leading-tight tracking-tight sm:text-4xl'>
                Tus números, sin tantas vueltas.
              </h2>
              <p className='mt-4 max-w-[55ch] text-base leading-8 text-slate-600 dark:text-slate-300'>
                No hace falta tener todo resuelto para empezar. Cargás lo que querés seguir,
                volvés cuando lo necesitás y encontrás la información ordenada.
              </p>
            </div>
          </div>
          <div className='divide-y divide-slate-200 dark:divide-slate-700'>
            {everyday.map(item=>(
              <article className='grid gap-3 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20'
                key={item.number}>
                <div className='flex items-baseline gap-5'>
                  <span className='font-Montserrat text-sm text-purple-700 dark:text-purple-300'>{item.number}</span>
                  <h3 className='max-w-[23ch] font-Montserrat text-xl font-bold leading-snug sm:text-2xl'>{item.title}</h3>
                </div>
                <div>
                  <p className='max-w-[56ch] text-base leading-7 text-slate-700 dark:text-slate-200'>{item.body}</p>
                  <p className='mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400'>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id='control-de-tarjetas' className='border-y border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
          aria-labelledby='cards-heading'>
          <div className={wrap + ' grid gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20'}>
            <div>
              <p className={editorialLabel}>Antes del próximo cierre</p>
              <h2 id='cards-heading' className='mt-5 max-w-[16ch] font-Montserrat text-3xl font-bold leading-tight tracking-tight sm:text-4xl'>
                Que la tarjeta no te tome por sorpresa.
              </h2>
              <p className='mt-6 max-w-[52ch] text-base leading-8 text-slate-600 dark:text-slate-300'>
                Sumá los consumos registrados de tus tarjetas, definí un tope en pesos o dólares
                y mirá cuánto margen te queda. Podés compararlo con los meses anteriores,
                incluso cuando los resúmenes vienen de distintos bancos.
              </p>
              <div className='mt-8 space-y-3 text-sm text-slate-700 dark:text-slate-200'>
                <p className='flex items-start gap-3'><FiCheck className='mt-1 shrink-0 text-purple-700 dark:text-purple-300' aria-hidden='true'/> Alertas de gastos de tarjetas dentro de LTC$.</p>
                <p className='flex items-start gap-3'><FiCheck className='mt-1 shrink-0 text-purple-700 dark:text-purple-300' aria-hidden='true'/> Historial de PDFs vinculados de todos tus bancos.</p>
                <p className='flex items-start gap-3'><FiCheck className='mt-1 shrink-0 text-purple-700 dark:text-purple-300' aria-hidden='true'/> Capturas del home banking convertidas en Markdown y revisadas antes de guardar.</p>
              </div>
              <Link to={user ? '/bancos' : '/registrarse'}
                className='mt-8 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200'>
                {user ? 'Ir al control de tarjetas' : 'Empezar a controlar mis tarjetas'}
                <FiArrowUpRight aria-hidden='true' size={16}/>
              </Link>
            </div>
            <div className='border-l-2 border-purple-600 pl-6 sm:pl-9'>
              <p className='text-sm text-slate-500 dark:text-slate-400'>Un ejemplo de lo que podés consultar</p>
              <p className='mt-5 max-w-[19ch] font-Montserrat text-2xl font-semibold leading-snug tracking-tight sm:text-3xl'>
                “¿Cuánto puedo gastar antes de pasarme?”
              </p>
              <div className='mt-8 border-t border-slate-200 pt-6 dark:border-slate-700'>
                <p className='text-sm text-slate-500 dark:text-slate-400'>La respuesta puede estar a la vista.</p>
                <p className='mt-3 font-Montserrat text-[clamp(2rem,5vw,3.6rem)] font-bold tracking-tight tabular-nums'>$ 70.000</p>
                <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Margen restante en un ejemplo ilustrativo.</p>
              </div>
              <p className='mt-6 text-xs leading-6 text-slate-500 dark:text-slate-400'>
                Las alertas se basan en lo que registrás. Los avisos del navegador funcionan
                mientras LTC$ está abierto; todavía no hay push con la app cerrada.
              </p>
            </div>
          </div>
        </section>

        <section className={wrap + ' py-20 sm:py-24 lg:py-28'} aria-labelledby='tools-heading'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20'>
            <div>
              <p className={editorialLabel}>A tu manera</p>
              <h2 id='tools-heading' className='mt-4 max-w-[19ch] font-Montserrat text-3xl font-bold leading-tight tracking-tight sm:text-4xl'>
                Un poco más que anotar gastos.
              </h2>
              <p className='mt-5 max-w-[45ch] text-base leading-8 text-slate-600 dark:text-slate-300'>
                Hay días para revisar un resumen, otros para ver un gráfico.
                Usá lo que necesitás, cuando lo necesitás.
              </p>
            </div>
            <dl className='divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700'>
              {moreTools.map(([name,description])=>(
                <div className='py-5 sm:py-6' key={name}>
                  <dt className='font-Montserrat text-base font-bold sm:text-lg'>{name}</dt>
                  <dd className='mt-2 max-w-[58ch] text-sm leading-7 text-slate-600 dark:text-slate-300'>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id='conoce-lita' className='border-y border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-100'
          aria-labelledby='lita-heading'>
          <div className={wrap + ' grid gap-9 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20'}>
            <div>
              <p className={editorialLabel}>Lita · tu asistente</p>
              <h2 id='lita-heading' className='mt-4 max-w-[19ch] font-Montserrat text-3xl font-bold leading-tight tracking-tight sm:text-4xl'>
                Cuando necesitás otra mirada.
              </h2>
              <p className='mt-5 max-w-[48ch] text-base leading-8 text-slate-600 dark:text-slate-300'>
                LITA te ayuda a hacer preguntas sobre los movimientos, las inversiones y
                los consumos de tarjeta que registraste. Las decisiones siguen siendo tuyas.
              </p>
              <p className='mt-6 flex max-w-[50ch] items-start gap-2 text-xs leading-6 text-slate-500 dark:text-slate-400'>
                <FiLock className='mt-1 shrink-0' aria-hidden='true' />
                Sus respuestas dependen de tus datos y pueden requerir verificación.
                LITA no reemplaza asesoramiento financiero profesional.
              </p>
            </div>
            <div className='border-t border-slate-200 dark:border-slate-700'>
              <p className='py-4 text-xs font-bold text-slate-500 dark:text-slate-400'>Ideas de consultas que podés hacer</p>
              <ul className='divide-y divide-slate-200 dark:divide-slate-700'>
                {litaQuestions.map(question=>(
                  <li className='py-5 text-base leading-7 text-slate-700 dark:text-slate-200' key={question}>
                    “{question}”
                  </li>
                ))}
              </ul>
              <Link to={startLink} className='mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-800 dark:text-purple-300'>
                {user ? 'Abrir Lleva Tus Cuentas' : 'Empezar a usar LTC'}
                <FiArrowUpRight aria-hidden='true' size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className={wrap + ' flex flex-col items-start justify-between gap-8 py-16 sm:py-20 lg:flex-row lg:items-center'} aria-labelledby='ready-heading'>
          <div>
            <p className={editorialLabel}>Para empezar</p>
            <h2 id='ready-heading' className='mt-3 max-w-[25ch] font-Montserrat text-2xl font-bold tracking-tight sm:text-3xl'>
              Un lugar propio para llevar tus cuentas.
            </h2>
          </div>
          <Link to={startLink} className={action}>
            {user ? 'Ir a mi panel' : 'Comenzar'}
            <FiArrowRight aria-hidden='true' size={18} />
          </Link>
        </section>
      </main>
      <AppFooter minimal />
    </>
  );
}

export default Home;
