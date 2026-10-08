import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiArrowUpRight,
  FiBarChart2,
  FiCheck,
  FiCreditCard,
  FiLock,
  FiMessageSquare,
  FiPieChart,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import AppFooter from '../components/AppFooter';

const primaryButton =
  'inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/40';

const secondaryButton =
  'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 transition-colors hover:border-purple-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

const capabilities = [
  {
    icon: FiCreditCard,
    title: 'Movimientos bajo control',
    description: 'Registrá ingresos y gastos, organizalos por categoría y seguí tu balance.',
    detail: 'MOVIMIENTOS',
  },
  {
    icon: FiPieChart,
    title: 'Tu patrimonio, más claro',
    description: 'Consultá tus cuentas, inversiones, rendimientos y vencimientos en un mismo lugar.',
    detail: 'PORTFOLIO',
  },
  {
    icon: FiMessageSquare,
    title: 'Preguntale a LITA',
    description: 'Explorá tus finanzas con un asistente de IA que usa el contexto disponible en LTC.',
    detail: 'INTELIGENCIA ARTIFICIAL',
  },
];

const exampleQuestions = [
  '¿En qué categorías estoy gastando más?',
  '¿Cómo se distribuyen mis inversiones?',
  '¿Qué debería revisar de mis rendimientos?',
];

function ProductPreview() {
  return (
    <div
      className='relative mx-auto w-full max-w-[540px] lg:ml-auto'
      aria-label='Vista ilustrativa del panel financiero y LITA'
    >
      <div className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20'>
        <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5'>
          <div className='flex items-center gap-2.5'>
            <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white' aria-hidden='true'>
              <FiActivity size={17} />
            </span>
            <span className='text-sm font-bold text-slate-900 dark:text-white'>Mi espacio financiero</span>
          </div>
          <span className='rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400'>
            Vista ilustrativa
          </span>
        </div>

        <div className='space-y-3.5 p-4 sm:p-5'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/70'>
              <span className='flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400'>
                <FiCreditCard aria-hidden='true' /> Movimientos
              </span>
              <p className='mt-3 text-base font-bold text-slate-900 dark:text-white'>Ingresos y gastos</p>
              <div className='mt-3 flex h-1.5 gap-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700' aria-hidden='true'>
                <div className='w-[58%] rounded-full bg-purple-500' />
                <div className='w-[35%] rounded-full bg-emerald-500' />
              </div>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/70'>
              <span className='flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400'>
                <FiTrendingUp aria-hidden='true' /> Portfolio
              </span>
              <p className='mt-3 text-base font-bold text-slate-900 dark:text-white'>Tus inversiones</p>
              <div className='mt-3 flex items-end gap-1.5' aria-hidden='true'>
                {[8, 13, 11, 19, 16, 23, 26].map((height, index) => (
                  <span
                    key={index}
                    className='w-4 rounded-t-sm bg-purple-400/80 dark:bg-purple-400/90'
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className='rounded-2xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-500/30 dark:bg-purple-950/20'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2.5'>
                <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white' aria-hidden='true'>
                  <HiOutlineSparkles size={20} />
                </span>
                <div>
                  <p className='text-sm font-extrabold text-slate-950 dark:text-white'>LITA</p>
                  <p className='text-[11px] text-slate-600 dark:text-slate-300'>Asistente financiero con IA</p>
                </div>
              </div>
              <span className='rounded-md bg-white px-2 py-1 text-[10px] font-bold tracking-wide text-purple-700 dark:bg-purple-900/60 dark:text-purple-200'>
                IA EN LTC
              </span>
            </div>
            <div className='mt-4 ml-auto w-fit max-w-[94%] rounded-2xl rounded-tr-sm bg-purple-600 px-3.5 py-2.5 text-sm font-medium text-white'>
              ¿Dónde estoy gastando más?
            </div>
            <div className='mt-2.5 mr-5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'>
              Podés analizar tus gastos por categoría y entender cómo se distribuyen tus movimientos.
            </div>
          </div>
          <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
            <FiShield className='shrink-0' aria-hidden='true' />
            <span>Una experiencia pensada para organizar tus finanzas.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const user = useSelector((state) => state.auth.user);
  const startLink = user ? '/transacciones' : '/registrarse';

  return (
    <>
      <main className='overflow-x-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-white'>
        <section className='relative isolate border-b border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950' aria-labelledby='home-heading'>
          <div className='mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-24'>
            <div className='max-w-[650px]'>
              <div className='inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-extrabold tracking-wide text-purple-700 dark:border-purple-500/30 dark:bg-purple-950/30 dark:text-purple-200'>
                <HiOutlineSparkles className='h-4 w-4' aria-hidden='true' />
                FINANZAS PERSONALES + IA
              </div>
              <h1 id='home-heading' className='mt-6 font-Montserrat text-[clamp(2.3rem,5vw,4.2rem)] font-extrabold leading-[1.12] tracking-tight'>
                Entendé tu dinero.{' '}
                <span className='text-purple-600 dark:text-purple-400'>Decidí con más claridad.</span>
              </h1>
              <p className='mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-relaxed'>
                Tus movimientos, inversiones y un asistente financiero con inteligencia artificial, todo en un solo lugar. Menos tiempo buscando números, más tiempo entendiendo tus cuentas.
              </p>
              <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                <Link to={startLink} className={primaryButton}>
                  {user ? 'Ir a mis movimientos' : 'Empezar ahora'}
                  <FiArrowRight aria-hidden='true' size={19} />
                </Link>
                <a href='#conoce-lita' className={secondaryButton}>
                  Conocé a LITA
                  <FiArrowUpRight aria-hidden='true' size={18} />
                </a>
              </div>
              <div className='mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 sm:text-sm'>
                <span className='inline-flex items-center gap-1.5'><FiCheck className='text-emerald-600 dark:text-emerald-400' aria-hidden='true' /> Gastos organizados</span>
                <span className='inline-flex items-center gap-1.5'><FiCheck className='text-emerald-600 dark:text-emerald-400' aria-hidden='true' /> Inversiones en un lugar</span>
                <span className='inline-flex items-center gap-1.5'><FiCheck className='text-emerald-600 dark:text-emerald-400' aria-hidden='true' /> Consultas con IA</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24' aria-labelledby='features-heading'>
          <div className='max-w-2xl'>
            <p className='text-xs font-extrabold uppercase tracking-[0.15em] text-purple-600 dark:text-purple-400'>Todo en un mismo lugar</p>
            <h2 id='features-heading' className='mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl'>Más visión de tus finanzas, menos complicaciones.</h2>
            <p className='mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300'>Una herramienta para registrar, seguir y entender tu dinero en el día a día.</p>
          </div>
          <div className='mt-9 grid gap-4 md:grid-cols-3'>
            {capabilities.map(({ icon: Icon, title, description, detail }) => (
              <article key={title} className='group rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-purple-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-purple-700 dark:hover:bg-slate-900'>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'>
                  <Icon size={23} aria-hidden='true' />
                </div>
                <p className='mt-6 text-[11px] font-extrabold tracking-[0.13em] text-slate-500 dark:text-slate-400'>{detail}</p>
                <h3 className='mt-2 text-xl font-extrabold'>{title}</h3>
                <p className='mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300'>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id='conoce-lita' className='scroll-mt-24 bg-slate-950 text-white' aria-labelledby='lita-heading'>
          <div className='mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-24'>
            <div>
              <span className='inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-purple-200'>
                <HiOutlineSparkles size={17} aria-hidden='true' />
                Conocé a LITA
              </span>
              <h2 id='lita-heading' className='mt-6 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl'>
                Tus números también pueden darte respuestas.
              </h2>
              <p className='mt-5 max-w-lg text-base leading-8 text-slate-300 sm:text-lg'>
                LITA es el asistente de IA integrado en Lleva Tus Cuentas. Hacé preguntas sobre tus movimientos y tu portfolio, y obtené explicaciones basadas en la información disponible en tu cuenta.
              </p>
              <div className='mt-7 flex flex-wrap gap-3 text-sm text-slate-300'>
                <span className='inline-flex items-center gap-2'><FiBarChart2 className='text-purple-400' aria-hidden='true' /> Gastos por categoría</span>
                <span className='inline-flex items-center gap-2'><FiTrendingUp className='text-purple-400' aria-hidden='true' /> Seguimiento de inversiones</span>
              </div>
              <p className='mt-6 flex max-w-lg items-start gap-2 text-xs leading-6 text-slate-400'>
                <FiLock className='mt-1 shrink-0' aria-hidden='true' />
                Las respuestas dependen de los datos registrados y pueden requerir verificación. LITA no reemplaza asesoramiento financiero profesional.
              </p>
            </div>
            <div className='rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-7'>
              <div className='flex items-center gap-3 border-b border-slate-700 pb-5'>
                <span className='flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white'><HiOutlineSparkles size={24} aria-hidden='true' /></span>
                <div>
                  <p className='font-extrabold'>Preguntale a LITA</p>
                  <p className='text-xs text-slate-400'>Ideas de consultas que podés hacer</p>
                </div>
              </div>
              <ul className='mt-5 space-y-3'>
                {exampleQuestions.map((question) => (
                  <li key={question} className='flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-4 text-sm leading-6 text-slate-100'>
                    <span>{question}</span>
                    <FiArrowUpRight className='shrink-0 text-purple-300' size={18} aria-hidden='true' />
                  </li>
                ))}
              </ul>
              <Link to={startLink} className='mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-purple-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/50'>
                {user ? 'Abrir Lleva Tus Cuentas' : 'Empezar a usar LTC'}
                <FiArrowRight aria-hidden='true' />
              </Link>
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20' aria-labelledby='ready-heading'>
          <div className='flex flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-800 dark:bg-slate-900/60 sm:p-10 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400'>Tu próximo paso</p>
              <h2 id='ready-heading' className='mt-2 text-2xl font-extrabold sm:text-3xl'>Empezá a ver el panorama completo.</h2>
              <p className='mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300'>Ordená tus movimientos, consultá tu patrimonio y descubrí cómo puede ayudarte LITA.</p>
            </div>
            <Link to={startLink} className={primaryButton + ' shrink-0'}>
              {user ? 'Ir a mi panel' : 'Comenzar'}
              <FiArrowRight aria-hidden='true' size={18} />
            </Link>
          </div>
        </section>
      </main>
      <AppFooter minimal />
    </>
  );
}

export default Home;
